/**
 * @fileoverview Chat agent server for Far East Restaurant text-based ordering.
 *
 * This module handles text-based customer interactions through a web interface.
 * It uses OpenAI's Agents SDK to process messages and manage order conversations.
 *
 * @module chat_agent
 */

import express from 'express';
import { createServer } from 'http';
import { Agent, run, tool } from '@openai/agents';

import Twilio from 'twilio';
import { createOrderAtomic } from './database.js';
import { CHAT_AGENT_INSTRUCTIONS } from './agentPrompt.js';
import { submitOrderSchema } from './orderSchema.js';
import orderBroadcaster from './orderBroadcaster.js';
import config from './config.js';

// Twilio client for SMS (only initialized if credentials exist)
const twilioClient = config.credentials.twilioAccountSid && config.credentials.twilioAuthToken
  ? Twilio(config.credentials.twilioAccountSid, config.credentials.twilioAuthToken)
  : null;

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

/**
 * Stores conversation histories per session.
 * Key: sessionId, Value: Array of { role: string, content: string }
 * @type {Map<string, Array>}
 */
const sessions = new Map();

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

/**
 * Submit order tool for the chat agent.
 * Saves the order to the database and returns confirmation.
 */
const submitOrder = tool({
  name: 'submit_order',
  description:
    'Submit the customer order after confirming all details with the customer. ' +
    'Use this after you have confirmed the complete order, total price, and collected their phone number.',
  parameters: submitOrderSchema,

  /**
   * Executes the order submission.
   *
   * @param {Object} params - Order parameters
   * @param {string} params.phoneNumber - Customer phone number
   * @param {Array} params.items - Array of order items
   * @param {string} [params.notes] - Order notes
   * @param {number} params.totalPrice - Total price including tax
   * @param {string} [params.scheduledPickupTime] - Scheduled pickup time (ISO string)
   * @returns {Promise<string>} Success or failure message
   */
  execute: async ({ phoneNumber, items, notes, totalPrice, scheduledPickupTime }) => {
    try {
      const { orderNumber } = createOrderAtomic({
        phoneNumber,
        totalPrice,
        notes: notes && notes.trim() ? notes : '',
        scheduledPickupTime: scheduledPickupTime || null,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          size: item.size === 'N/A' ? null : item.size,
          price: item.price,
          modifications: item.modifications || '',
        })),
      });

      logOrderSubmission(orderNumber, phoneNumber, items, totalPrice, scheduledPickupTime);

      // Broadcast order to frontend dashboard (same as voice agent)
      await broadcastOrderToFrontend(orderNumber, phoneNumber, items, notes, totalPrice, scheduledPickupTime);

      // Send SMS confirmation (FAREAST-19)
      await sendOrderConfirmationSMS(phoneNumber, orderNumber, items, totalPrice, scheduledPickupTime);

      // Format pickup time message
      const pickupMsg = scheduledPickupTime
        ? `Scheduled pickup at ${new Date(scheduledPickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : `Ready for pickup in ${config.restaurant.estimatedPickupTime}`;

      return `Order ${orderNumber} submitted successfully. Total: $${totalPrice.toFixed(2)}. ${pickupMsg}.`;
    } catch (error) {
      console.error('[Chat] Failed to save order:', error);
      return `Order recorded. Total: $${totalPrice.toFixed(2)}`;
    }
  },
});

// ---------------------------------------------------------------------------
// Agent Setup
// ---------------------------------------------------------------------------

/**
 * The chat agent instance configured with restaurant instructions and tools.
 */
const chatAgent = new Agent({
  name: 'Far East Order Assistant',
  instructions: CHAT_AGENT_INSTRUCTIONS,
  model: config.chatAgent.model,
  tools: [submitOrder],
});

// ---------------------------------------------------------------------------
// Express App Setup
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// Enable CORS for all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Serves the chat interface HTML page.
 *
 * @route GET /
 */
app.get('/', (req, res) => {
  res.send(getChatInterfaceHtml());
});

/**
 * Processes chat messages from the frontend.
 *
 * @route POST /chat
 * @param {Object} req.body - Request body
 * @param {string} req.body.sessionId - Unique session identifier
 * @param {string} req.body.message - User message
 */
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message required' });
  }

  // Get or create session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);

  // Build conversation context
  const inputText = buildConversationContext(history, message);

  try {
    console.log(`\n[Chat] --- Request ---`);
    console.log(`[Chat] Session: ${sessionId}`);
    console.log(`[Chat] Message: ${message}`);
    console.log(`[Chat] History length: ${history.length}`);

    // Run the agent with context
    const result = await run(chatAgent, inputText, {
      maxTurns: config.chatAgent.maxTurns,
    });

    // Extract response from model output
    const responseText = extractResponseText(result);

    console.log(`[Chat] Response: ${responseText.slice(0, 100)}...`);

    // Update session history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: responseText });
    sessions.set(sessionId, history);

    res.json({ response: responseText || "I'm here to help you place an order!" });
  } catch (error) {
    console.error('[Chat] Agent error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      response: 'Sorry, I encountered an error. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Logs order submission details to console.
 *
 * @param {string} orderNumber - Generated order number
 * @param {string} phoneNumber - Customer phone number
 * @param {Array} items - Array of order items
 * @param {number} totalPrice - Total price
 * @param {string|null} scheduledPickupTime - Scheduled pickup time (ISO string)
 */
function logOrderSubmission(orderNumber, phoneNumber, items, totalPrice, scheduledPickupTime) {
  console.log('\n[Chat] NEW ORDER SAVED TO DATABASE:');
  console.log(`   Order #: ${orderNumber}`);
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Items (${items.length}):`);
  items.forEach((item, i) => {
    const modsDisplay = item.modifications?.trim() ? ` [${item.modifications}]` : '';
    const sizeDisplay = item.size && item.size !== 'N/A' ? ` (${item.size})` : '';
    console.log(
      `     ${i + 1}. ${item.name}${sizeDisplay} x${item.quantity} @ $${item.price.toFixed(2)}${modsDisplay}`
    );
  });
  console.log(`   Total: $${totalPrice.toFixed(2)}`);
  console.log(`   Pickup: ${scheduledPickupTime ? new Date(scheduledPickupTime).toLocaleTimeString() : 'ASAP (10-15 min)'}\n`);
}

/**
 * Builds conversation context string from history and new message.
 *
 * @param {Array} history - Previous messages in the conversation
 * @param {string} message - Current user message
 * @returns {string} Formatted context string for the agent
 */
function buildConversationContext(history, message) {
  let conversationContext = '';

  if (history.length > 0) {
    conversationContext = '\n\n[Previous conversation in this session:]\n';
    for (const msg of history) {
      const role = msg.role === 'user' ? 'Customer' : 'Sarah';
      conversationContext += `${role}: ${msg.content}\n`;
    }
    conversationContext += '\n[Continue the conversation based on the above context.]\n\n';
  }

  return conversationContext + `Customer: ${message}`;
}

/**
 * Extracts the text response from the agent result object.
 *
 * @param {Object} result - The agent run result
 * @returns {string} The extracted response text
 */
function extractResponseText(result) {
  let responseText = '';

  if (result.state && result.state._modelResponses) {
    const modelResponses = result.state._modelResponses;
    if (modelResponses.length > 0) {
      const lastResponse = modelResponses[modelResponses.length - 1];
      if (lastResponse.output && lastResponse.output.length > 0) {
        for (const outputItem of lastResponse.output) {
          if (outputItem.type === 'message' && outputItem.content) {
            for (const contentItem of outputItem.content) {
              if (contentItem.type === 'output_text' && contentItem.text) {
                responseText = contentItem.text;
              }
            }
          }
        }
      }
    }
  }

  return responseText;
}

/**
 * Broadcasts a new order to all connected frontend clients.
 *
 * @param {string} orderNumber - Generated order number
 * @param {string} phoneNumber - Customer phone number
 * @param {Array} items - Array of order items
 * @param {string} notes - Order notes
 * @param {number} totalPrice - Total price
 * @param {string|null} scheduledPickupTime - Scheduled pickup time (ISO string)
 */
async function broadcastOrderToFrontend(orderNumber, phoneNumber, items, notes, totalPrice, scheduledPickupTime) {
  await orderBroadcaster.broadcastOrder({
    orderNumber,
    phoneNumber,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      size: item.size === 'N/A' ? null : item.size,
      price: item.price,
      modifications: item.modifications || '',
    })),
    notes: notes || '',
    totalPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
    scheduledPickupTime: scheduledPickupTime || null,
    source: 'chat', // Distinguish chat orders from voice orders
  });
}

/**
 * Sends SMS order confirmation to customer (FAREAST-19).
 *
 * @param {string} phoneNumber - Customer phone number
 * @param {string} orderNumber - Order number
 * @param {Array} items - Array of order items
 * @param {number} totalPrice - Total price including tax
 * @param {string|null} scheduledPickupTime - Scheduled pickup time (ISO string)
 * @returns {Promise<void>}
 */
async function sendOrderConfirmationSMS(phoneNumber, orderNumber, items, totalPrice, scheduledPickupTime) {
  // Skip if SMS not configured
  if (!twilioClient || !config.sms?.enabled || !config.sms?.fromNumber) {
    console.log('[Chat SMS] SMS notifications disabled');
    return;
  }

  // Format phone number for Twilio
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `+1${formattedPhone}`;
  } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
    formattedPhone = `+${formattedPhone}`;
  } else {
    formattedPhone = `+${formattedPhone}`;
  }

  const itemList = items
    .map((item) => `• ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`)
    .slice(0, 5)
    .join('\n');
  const moreItems = items.length > 5 ? `\n...and ${items.length - 5} more items` : '';

  // Format pickup time (FAREAST-33)
  const pickupTimeStr = scheduledPickupTime
    ? `Scheduled: ${new Date(scheduledPickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : `Ready in ${config.restaurant.estimatedPickupTime}`;

  const message = `🍜 Far East Kitchen - Order Confirmed!

Order #${orderNumber}
${itemList}${moreItems}

Total: $${totalPrice.toFixed(2)}
Pickup: ${pickupTimeStr}

📍 ${config.restaurant.address}
📞 ${config.restaurant.phone}

Thank you for your order!`;

  try {
    await twilioClient.messages.create({
      body: message,
      from: config.sms.fromNumber,
      to: formattedPhone,
    });
    console.log(`[Chat SMS] Confirmation sent to ${formattedPhone} for order ${orderNumber}`);
  } catch (error) {
    console.error(`[Chat SMS] Failed to send confirmation:`, error.message);
  }
}

/**
 * Periodically cleans up old sessions to prevent memory leaks.
 * Removes oldest sessions when total exceeds maxSessions threshold.
 */
function setupSessionCleanup() {
  setInterval(() => {
    if (sessions.size > config.chatAgent.maxSessions) {
      const keysToDelete = Array.from(sessions.keys()).slice(0, 50);
      keysToDelete.forEach((key) => sessions.delete(key));
      console.log(`[Chat] Cleaned up ${keysToDelete.length} old sessions`);
    }
  }, config.chatAgent.sessionCleanupInterval);
}

/**
 * Returns the HTML for the chat interface.
 * Note: This HTML is a static template with no user-generated content.
 *
 * @returns {string} Complete HTML document
 */
function getChatInterfaceHtml() {
  // Using template literals for the static HTML content
  // All values are from config (trusted source) - no user input
  const restaurantName = config.restaurant.name;
  const restaurantAddress = config.restaurant.address;
  const restaurantPhone = config.restaurant.phone;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Far East - Chat Order</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .chat-container {
      width: 100%;
      max-width: 500px;
      height: 90vh;
      max-height: 800px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chat-header {
      background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .chat-header h1 { font-size: 1.4rem; margin-bottom: 5px; }
    .chat-header p { font-size: 0.85rem; opacity: 0.9; }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f8f9fa;
    }
    .message {
      margin-bottom: 15px;
      display: flex;
      flex-direction: column;
    }
    .message.user { align-items: flex-end; }
    .message.assistant { align-items: flex-start; }
    .message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 0.95rem;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .message.user .message-bubble {
      background: #c41e3a;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .message.assistant .message-bubble {
      background: white;
      color: #333;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .message-label {
      font-size: 0.75rem;
      color: #888;
      margin-bottom: 4px;
      padding: 0 8px;
    }
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #c41e3a;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .chat-input-container {
      padding: 15px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
    }
    .chat-input-container input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #eee;
      border-radius: 25px;
      font-size: 1rem;
      outline: none;
    }
    .chat-input-container input:focus { border-color: #c41e3a; }
    .chat-input-container button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #c41e3a;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-input-container button:hover { background: #a01830; }
    .chat-input-container button:disabled { background: #ccc; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="chat-header">
      <h1>${restaurantName}</h1>
      <p>${restaurantAddress} | ${restaurantPhone}</p>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-container">
      <input type="text" id="userInput" placeholder="Type your message..." autofocus>
      <button id="sendBtn" onclick="sendMessage()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2"/>
        </svg>
      </button>
    </div>
  </div>
  <script>
    const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    let isProcessing = false;

    function addMessage(role, content) {
      const messagesDiv = document.getElementById('chatMessages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + role;
      const label = document.createElement('div');
      label.className = 'message-label';
      label.textContent = role === 'user' ? 'You' : 'Sarah';
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = content;
      messageDiv.appendChild(label);
      messageDiv.appendChild(bubble);
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function showTyping() {
      const messagesDiv = document.getElementById('chatMessages');
      const typingDiv = document.createElement('div');
      typingDiv.className = 'message assistant';
      typingDiv.id = 'typingIndicator';
      // Static HTML content - no user input
      const label = document.createElement('div');
      label.className = 'message-label';
      label.textContent = 'Sarah';
      const indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      for (let i = 0; i < 3; i++) {
        indicator.appendChild(document.createElement('span'));
      }
      typingDiv.appendChild(label);
      typingDiv.appendChild(indicator);
      messagesDiv.appendChild(typingDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function hideTyping() {
      const typing = document.getElementById('typingIndicator');
      if (typing) typing.remove();
    }

    async function sendMessage() {
      const input = document.getElementById('userInput');
      const message = input.value.trim();
      if (!message || isProcessing) return;

      input.value = '';
      addMessage('user', message);
      isProcessing = true;
      document.getElementById('sendBtn').disabled = true;
      showTyping();

      try {
        const response = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message })
        });
        const data = await response.json();
        hideTyping();
        addMessage('assistant', data.response);
      } catch (error) {
        hideTyping();
        addMessage('assistant', 'Sorry, something went wrong. Please try again.');
      }

      isProcessing = false;
      document.getElementById('sendBtn').disabled = false;
      input.focus();
    }

    document.getElementById('userInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Start conversation
    (async () => {
      showTyping();
      try {
        const response = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: 'Hello' })
        });
        const data = await response.json();
        hideTyping();
        addMessage('assistant', data.response);
      } catch (error) {
        hideTyping();
        addMessage('assistant', 'Hello! Welcome to Far East Chinese Restaurant. How can I help you today?');
      }
    })();
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

// Set up periodic session cleanup
setupSessionCleanup();

const server = createServer(app);

server.listen(config.ports.chat, () => {
  console.log(`
+====================================================+
|       Far East Chat Agent Server                   |
+====================================================+
|                                                    |
|   Open: http://localhost:${config.ports.chat}                      |
|                                                    |
|   Text-based order taking using OpenAI Agents SDK  |
|                                                    |
+====================================================+
  `);
});
