/**
 * @fileoverview Voice agent server for Far East Restaurant phone ordering.
 *
 * This module handles incoming Twilio phone calls and manages real-time voice
 * conversations with customers using OpenAI's Realtime API. It bridges Twilio's
 * audio streams with the AI agent for natural voice interactions.
 *
 * @module server
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import Twilio from 'twilio';

import {
  createOrderAtomic,
  getOrdersByPhoneNumber,
  addItemToOrder,
  removeItemFromOrder,
  cancelOrder,
} from './database.js';
import { orderBroadcaster } from './orderBroadcaster.js';
import { VOICE_AGENT_INSTRUCTIONS } from './agentPrompt.js';
import { submitOrderSchema } from './orderSchema.js';
import config from './config.js';
import { withRetry } from './retry.js';
import { walAppendPending, walCommit, generateWalId, replayPendingOrders } from './orderWAL.js';
import {
  recordSpeechEnd,
  recordResponseStart,
  clearCallLatency,
  recordError,
  metricsRouter,
} from './latencyTracker.js';

// ---------------------------------------------------------------------------
// Twilio Client Setup
// ---------------------------------------------------------------------------

/**
 * Twilio client for managing phone calls.
 * Used to programmatically end calls when the agent is done.
 */
const twilioClient = Twilio(
  config.credentials.twilioAccountSid,
  config.credentials.twilioAuthToken
);

// ---------------------------------------------------------------------------
// Active Call Tracking
// ---------------------------------------------------------------------------

/**
 * Map tracking active calls for monitoring concurrent usage.
 * Key: callSid, Value: { startTime: number, status: string }
 * @type {Map<string, Object>}
 */
const activeCalls = new Map();

// ---------------------------------------------------------------------------
// Express App Setup
// ---------------------------------------------------------------------------

const app = express();
const server = createServer(app);

// Mount latency metrics endpoint
app.use(metricsRouter);

// ---------------------------------------------------------------------------
// AI Failover Helper
// ---------------------------------------------------------------------------

/**
 * Handles an unrecoverable AI session failure by transferring the customer to
 * restaurant staff. If the transfer itself fails, ends the call politely.
 *
 * @param {string} callSid - Twilio call SID
 * @param {Error|*} error - The error that triggered the failover
 * @returns {Promise<void>}
 */
async function handleAIFailure(callSid, error) {
  console.error(`[Voice] AI failure on call ${callSid}:`, error?.message || error);
  recordError();

  if (!callSid) {
    console.error('[Voice] handleAIFailure: no callSid, cannot recover');
    return;
  }

  // --- Attempt 1: Transfer to staff ---
  if (config.callTransfer.enabled) {
    try {
      const transferTwiml = `
        <Response>
          <Say>I'm having some trouble. Let me connect you with a staff member right away. Please hold.</Say>
          <Dial timeout="${config.callTransfer.timeout}" callerId="${config.sms.fromNumber || '+16077971166'}">
            ${config.callTransfer.staffPhoneNumber}
          </Dial>
          <Say>We're sorry, no one is available right now. Please call us back during business hours. Goodbye.</Say>
        </Response>
      `;
      await withRetry(() => twilioClient.calls(callSid).update({ twiml: transferTwiml }));
      console.log(`[Voice] AI failure: call ${callSid} transferred to staff`);
      return;
    } catch (transferErr) {
      console.error(`[Voice] AI failure: transfer also failed for ${callSid}:`, transferErr.message);
    }
  }

  // --- Attempt 2: Polite goodbye ---
  try {
    const goodbyeTwiml = `
      <Response>
        <Say>We're sorry, we're experiencing technical difficulties. Please call us back at our main number. Goodbye.</Say>
        <Hangup/>
      </Response>
    `;
    await withRetry(() => twilioClient.calls(callSid).update({ twiml: goodbyeTwiml }));
    console.log(`[Voice] AI failure: call ${callSid} ended with polite goodbye`);
  } catch (hangupErr) {
    console.error(`[Voice] AI failure: goodbye also failed for ${callSid}:`, hangupErr.message);
  }
}

/**
 * Incoming call webhook endpoint.
 * When Twilio receives a call, it POSTs to this endpoint.
 * Responds with TwiML to connect the call to our WebSocket media stream.
 *
 * @route POST /incoming-call
 */
app.post('/incoming-call', express.urlencoded({ extended: false }), (req, res) => {
  const callSid = req.body.CallSid;
  console.log('[Voice] Incoming call:', callSid);

  // Respond with TwiML to stream audio to our WebSocket server
  res.type('xml').send(`
    <Response>
      <Connect>
        <Stream url="${config.urls.twilioMediaStream}">
          <Parameter name="callSid" value="${callSid}" />
        </Stream>
      </Connect>
    </Response>
  `);
});

// ---------------------------------------------------------------------------
// WebSocket Server Setup
// ---------------------------------------------------------------------------

/**
 * WebSocket server for Twilio audio streams.
 * Listens at /media-stream path and handles real-time audio.
 */
const wss = new WebSocketServer({ server, path: '/media-stream' });

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

/**
 * Creates the submit_order tool for a specific call session.
 * Saves the order to the database and broadcasts to connected frontends.
 *
 * @param {Function} getCallSid - Function that returns the current Twilio call SID for logging
 * @returns {Object} The tool definition
 */
function createSubmitOrderTool(getCallSid) {
  return tool({
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
        // Write-Ahead Log: persist intent before DB write
        const walId = generateWalId();
        const orderPayload = {
          phoneNumber,
          totalPrice,
          notes: notes || '',
          scheduledPickupTime: scheduledPickupTime || null,
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            size: item.size || null,
            price: item.price,
            modifications: item.modifications || '',
          })),
        };
        walAppendPending(walId, orderPayload);

        const { orderNumber } = createOrderAtomic(orderPayload);

        // WAL: mark as committed now that DB write succeeded
        walCommit(walId);

        logOrderSubmission(orderNumber, phoneNumber, items, totalPrice, getCallSid(), scheduledPickupTime);

        await broadcastOrderToFrontend(orderNumber, phoneNumber, items, notes, totalPrice, scheduledPickupTime);

        // Send SMS confirmation to customer (FAREAST-19)
        await sendOrderConfirmationSMS(phoneNumber, orderNumber, items, totalPrice, scheduledPickupTime);

        const pickupMsg = scheduledPickupTime
          ? `Scheduled pickup at ${new Date(scheduledPickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
          : 'Ready in 10-15 minutes';

        return `Order ${orderNumber} submitted successfully. Total: $${totalPrice.toFixed(2)}. ${pickupMsg}`;
      } catch (error) {
        console.error('[Voice] Failed to save order:', error);
        return `Order recorded. Total: $${totalPrice.toFixed(2)}`;
      }
    },
  });
}

/**
 * Creates the hang_up_call tool for a specific call session.
 * Ends the Twilio call after a brief delay to allow final message playback.
 *
 * @param {Function} getCallSid - Function that returns the current Twilio call SID
 * @returns {Object} The tool definition
 */
function createHangUpTool(getCallSid) {
  return tool({
    name: 'hang_up_call',
    description:
      'End the phone call. ONLY call this AFTER you have: ' +
      '1) submitted the order, 2) told the customer their order will take 10-15 minutes, ' +
      '3) said "Have a great day! Bye bye!" out loud. ' +
      'The customer MUST hear the goodbye message before hanging up.',
    parameters: {},

    /**
     * Executes the hang up action.
     *
     * @returns {Promise<string>} Success or failure message
     */
    execute: async () => {
      const callSid = getCallSid();
      console.log('[Voice] Agent requested hang up. CallSid:', callSid);
      console.log(`[Voice] Waiting ${config.voiceAgent.hangUpDelay}ms before hanging up...`);

      await sleep(config.voiceAgent.hangUpDelay);

      if (!callSid) {
        console.error('[Voice] No callSid available');
        return 'Could not end call - no call ID';
      }

      try {
        await withRetry(() => twilioClient.calls(callSid).update({ status: 'completed' }));
        console.log('[Voice] Call ended successfully');
        return 'Call ended successfully';
      } catch (err) {
        console.error('[Voice] Failed to hang up:', err.message);
        return 'Failed to end call';
      }
    },
  });
}

/**
 * Creates the transfer_to_human tool for a specific call session (FAREAST-4).
 * Transfers the call to restaurant staff when customer requests human assistance.
 *
 * @param {Function} getCallSid - Function that returns the current Twilio call SID
 * @returns {Object} The tool definition
 */
function createTransferToHumanTool(getCallSid) {
  return tool({
    name: 'transfer_to_human',
    description:
      'Transfer the call to a real staff member. Use this when the customer explicitly requests to speak with a person, ' +
      'says "speak to a human", "talk to someone", "real person", or is frustrated with the AI. ' +
      'IMPORTANT: Say "Let me transfer you to a staff member. Please hold." BEFORE calling this tool.',
    parameters: {},

    /**
     * Executes the call transfer to staff.
     *
     * @returns {Promise<string>} Success or failure message
     */
    execute: async () => {
      const callSid = getCallSid();
      console.log('[Voice] Agent requested transfer to human. CallSid:', callSid);

      if (!callSid) {
        console.error('[Voice] No callSid available for transfer');
        return 'Could not transfer - no call ID. Please have the customer call back and speak to staff directly.';
      }

      if (!config.callTransfer.enabled) {
        console.log('[Voice] Call transfer not configured (STAFF_PHONE_NUMBER not set)');
        return 'Transfer is not available right now. Please have the customer call back during business hours to speak with staff directly at our main number.';
      }

      try {
        // Use TwiML to dial the staff number
        // This redirects the current call to connect with the staff phone
        const twiml = `
          <Response>
            <Say>Please hold while we connect you to a staff member.</Say>
            <Dial timeout="${config.callTransfer.timeout}" callerId="${config.sms.fromNumber || '+16077971166'}">
              ${config.callTransfer.staffPhoneNumber}
            </Dial>
            <Say>We're sorry, but no one is available to take your call right now. Please try calling back during business hours. Goodbye.</Say>
          </Response>
        `;

        await withRetry(() => twilioClient.calls(callSid).update({ twiml }));
        console.log(`[Voice] Call ${callSid} transferred to ${config.callTransfer.staffPhoneNumber}`);
        return 'Call is being transferred to staff. The AI assistant will disconnect now.';
      } catch (err) {
        console.error('[Voice] Failed to transfer call:', err.message);
        return 'Unable to transfer right now. Please have the customer call our main number directly to speak with staff.';
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Order Modification Tools (FAREAST-5)
// ---------------------------------------------------------------------------

/**
 * Creates the lookup_order tool for finding existing orders.
 * Allows customers to look up and modify their recent orders.
 *
 * @returns {Object} The tool definition
 */
function createLookupOrderTool() {
  return tool({
    name: 'lookup_order',
    description:
      'Look up existing orders by phone number. Use this when a customer says they want to change, modify, ' +
      'add to, or cancel a recent order. Ask for their phone number first, then use this tool.',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'The customer phone number to look up orders for',
        },
      },
      required: ['phoneNumber'],
    },

    execute: async ({ phoneNumber }) => {
      console.log(`[Voice] Looking up orders for phone: ${phoneNumber}`);
      const orders = getOrdersByPhoneNumber(phoneNumber);

      if (orders.length === 0) {
        return 'No active orders found for this phone number. The customer may need to place a new order.';
      }

      // Format orders for the agent
      const orderSummaries = orders.map(order => {
        const itemList = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
        return `Order #${order.orderNumber} (${order.status}): ${itemList}. Total: $${order.total.toFixed(2)}`;
      }).join('\n');

      console.log(`[Voice] Found ${orders.length} order(s) for ${phoneNumber}`);
      return `Found ${orders.length} order(s):\n${orderSummaries}\n\nAsk the customer which order they want to modify and what changes they'd like to make.`;
    },
  });
}

/**
 * Creates the add_to_order tool for adding items to existing orders.
 *
 * @returns {Object} The tool definition
 */
function createAddToOrderTool() {
  return tool({
    name: 'add_to_order',
    description:
      'Add an item to an existing order. Use this after looking up the order with lookup_order.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: {
          type: 'string',
          description: 'The order number to add items to',
        },
        itemName: {
          type: 'string',
          description: 'Name of the menu item to add',
        },
        quantity: {
          type: 'number',
          description: 'Quantity of the item',
        },
        size: {
          type: 'string',
          description: 'Size of the item (Pt, Qt, etc.)',
        },
        price: {
          type: 'number',
          description: 'Price per item',
        },
        modifications: {
          type: 'string',
          description: 'Any special requests or modifications',
        },
      },
      required: ['orderNumber', 'itemName', 'quantity', 'price'],
    },

    execute: async ({ orderNumber, itemName, quantity, size, price, modifications }) => {
      console.log(`[Voice] Adding ${quantity}x ${itemName} to order ${orderNumber}`);

      const result = addItemToOrder(orderNumber, {
        name: itemName,
        quantity,
        size: size || null,
        price,
        modifications: modifications || '',
      });

      if (result.success) {
        // Broadcast the update to the frontend
        orderBroadcaster.broadcastOrderUpdate(orderNumber, 'item_added', {
          itemName,
          quantity,
          newTotal: result.newTotal,
        });
        console.log(`[Voice] Successfully added item. New total: $${result.newTotal.toFixed(2)}`);
        return `${result.message}. New total is $${result.newTotal.toFixed(2)}.`;
      }

      return result.message;
    },
  });
}

/**
 * Creates the remove_from_order tool for removing items from existing orders.
 *
 * @returns {Object} The tool definition
 */
function createRemoveFromOrderTool() {
  return tool({
    name: 'remove_from_order',
    description:
      'Remove an item from an existing order. Use this after looking up the order with lookup_order.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: {
          type: 'string',
          description: 'The order number to remove items from',
        },
        itemName: {
          type: 'string',
          description: 'Name of the item to remove (partial match is fine)',
        },
        quantity: {
          type: 'number',
          description: 'Quantity to remove. Omit to remove all of that item.',
        },
      },
      required: ['orderNumber', 'itemName'],
    },

    execute: async ({ orderNumber, itemName, quantity }) => {
      console.log(`[Voice] Removing ${quantity || 'all'} ${itemName} from order ${orderNumber}`);

      const result = removeItemFromOrder(orderNumber, itemName, quantity || null);

      if (result.success) {
        // Broadcast the update to the frontend
        orderBroadcaster.broadcastOrderUpdate(orderNumber, 'item_removed', {
          itemName,
          newTotal: result.newTotal,
        });
        console.log(`[Voice] Successfully removed item. New total: $${result.newTotal.toFixed(2)}`);
        return `${result.message}. New total is $${result.newTotal.toFixed(2)}.`;
      }

      return result.message;
    },
  });
}

/**
 * Creates the cancel_order tool for cancelling existing orders.
 *
 * @returns {Object} The tool definition
 */
function createCancelOrderTool() {
  return tool({
    name: 'cancel_order',
    description:
      'Cancel an entire order. Use this when a customer wants to cancel their order completely. ' +
      'Confirm with the customer before cancelling.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: {
          type: 'string',
          description: 'The order number to cancel',
        },
      },
      required: ['orderNumber'],
    },

    execute: async ({ orderNumber }) => {
      console.log(`[Voice] Cancelling order ${orderNumber}`);

      const result = cancelOrder(orderNumber);

      if (result.success) {
        // Broadcast the cancellation to the frontend
        orderBroadcaster.broadcastOrderUpdate(orderNumber, 'cancelled', {});
        console.log(`[Voice] Order ${orderNumber} cancelled successfully`);
        return result.message;
      }

      return result.message;
    },
  });
}

// ---------------------------------------------------------------------------
// WebSocket Connection Handler
// ---------------------------------------------------------------------------

/**
 * Handles new WebSocket connections from Twilio.
 * Sets up the AI agent, transport layer, and session management.
 * Includes call duration limits and idle detection (FAREAST-22).
 */
wss.on('connection', (twilioWs) => {
  let callSid = null;
  const connectionTime = Date.now();
  let lastActivityTime = Date.now();
  let warningTimer = null;
  let maxDurationTimer = null;
  let idleCheckInterval = null;

  console.log(`[Voice] New Twilio connection. Active calls: ${activeCalls.size}`);

  // Clean up timers when call ends
  function cleanupTimers() {
    if (warningTimer) clearTimeout(warningTimer);
    if (maxDurationTimer) clearTimeout(maxDurationTimer);
    if (idleCheckInterval) clearInterval(idleCheckInterval);
  }

  // Handle connection close
  twilioWs.on('close', () => {
    cleanupTimers();
    if (callSid) {
      clearCallLatency(callSid);
      activeCalls.delete(callSid);
      const duration = Math.round((Date.now() - connectionTime) / 1000);
      console.log(`[Voice] Call ${callSid} ended after ${duration}s. Active calls: ${activeCalls.size}`);
    }
  });

  // Handle connection errors
  twilioWs.on('error', (error) => {
    cleanupTimers();
    console.error(`[Voice] WebSocket error for call ${callSid}:`, error.message);
    if (callSid) {
      clearCallLatency(callSid);
      activeCalls.delete(callSid);
    }
  });

  // Listen for Twilio stream events
  twilioWs.on('message', (data) => {
    // Update activity timestamp for idle detection
    lastActivityTime = Date.now();

    try {
      const msg = JSON.parse(data);
      if (msg.event === 'start' && msg.start?.customParameters?.callSid) {
        callSid = msg.start.customParameters.callSid;
        activeCalls.set(callSid, {
          startTime: connectionTime,
          status: 'active',
        });
        console.log(`[Voice] Call started: ${callSid}. Active calls: ${activeCalls.size}`);
      }
      // Track media events as activity
      if (msg.event === 'media') {
        lastActivityTime = Date.now();
      }
    } catch {
      // Ignore parse errors for non-JSON messages
    }
  });

  // Create getter function to access current callSid value at execution time
  // (avoids closure capturing stale null value)
  const getCallSid = () => callSid;

  // Create tools with getter function for lazy callSid access
  const submitOrder = createSubmitOrderTool(getCallSid);
  const hangUpTool = createHangUpTool(getCallSid);
  const transferToHuman = createTransferToHumanTool(getCallSid);

  // Order modification tools (FAREAST-5)
  const lookupOrder = createLookupOrderTool();
  const addToOrder = createAddToOrderTool();
  const removeFromOrder = createRemoveFromOrderTool();
  const cancelOrderTool = createCancelOrderTool();

  // Create the AI agent
  const agent = new RealtimeAgent({
    name: 'Phone Assistant',
    instructions: VOICE_AGENT_INSTRUCTIONS,
    tools: [hangUpTool, submitOrder, transferToHuman, lookupOrder, addToOrder, removeFromOrder, cancelOrderTool],
  });

  // Bridge Twilio audio with OpenAI's Realtime API
  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: twilioWs,
  });

  const realtimeSession = new RealtimeSession(agent, { transport });

  // ---------------------------------------------------------------------------
  // Session error handler — distinguish fatal AI errors from normal hang-ups
  // ---------------------------------------------------------------------------
  realtimeSession.on('error', (error) => {
    const isFatal =
      error &&
      error.type !== 'session_closed' &&
      error.code !== 'session_expired' &&
      // Twilio closes the WS when the caller hangs up; treat that as non-fatal
      !(error.message && /websocket|closed|hangup|disconnect/i.test(error.message));

    if (isFatal) {
      console.error(`[Voice] Fatal session error on call ${callSid}:`, error.type || error.message || error);
      handleAIFailure(callSid, error);
    } else {
      console.log('[Voice] Session closed (caller may have hung up):', error.type || error.message || error);
    }
  });

  // ---------------------------------------------------------------------------
  // Latency tracking — hook into realtime session transport events
  // ---------------------------------------------------------------------------
  realtimeSession.on('transport.event', (event) => {
    if (!callSid) return;

    // User speech ended — start the latency clock
    if (event.type === 'input_audio_buffer.speech_stopped') {
      recordSpeechEnd(callSid);
    }

    // Agent response started — stop the latency clock
    if (event.type === 'response.created') {
      recordResponseStart(callSid);
    }
  });

  // Connect to OpenAI and initiate conversation
  realtimeSession
    .connect({ apiKey: config.credentials.openaiApiKey })
    .then(() => {
      console.log('[Voice] Connected to OpenAI!');

      // Send initial message to trigger AI greeting
      realtimeSession.sendMessage({
        role: 'user',
        content: [{ type: 'input_text', text: 'Hello' }],
      });

      // Set up call duration warning timer (FAREAST-22)
      warningTimer = setTimeout(() => {
        console.log(`[Voice] Call ${callSid} approaching time limit, sending warning`);
        realtimeSession.sendMessage({
          role: 'user',
          content: [{
            type: 'input_text',
            text: '[SYSTEM: The call has been going on for a while. Please wrap up the order efficiently. If the customer has finished ordering, confirm the order and get their phone number now.]'
          }],
        });
      }, config.voiceAgent.callTimeoutWarning);

      // Set up maximum call duration timer (FAREAST-22)
      maxDurationTimer = setTimeout(async () => {
        console.log(`[Voice] Call ${callSid} reached maximum duration (${config.voiceAgent.maxCallDuration / 1000}s), ending call`);
        realtimeSession.sendMessage({
          role: 'user',
          content: [{
            type: 'input_text',
            text: '[SYSTEM: Maximum call time reached. Please thank the customer, apologize for the time, and end the call now. If they have an order, submit it first.]'
          }],
        });
        // Give agent time to respond before force-ending
        await sleep(15000);
        if (callSid) {
          try {
            await withRetry(() => twilioClient.calls(callSid).update({ status: 'completed' }));
            console.log(`[Voice] Call ${callSid} force-ended due to timeout`);
          } catch (err) {
            console.error(`[Voice] Failed to end timed-out call:`, err.message);
          }
        }
      }, config.voiceAgent.maxCallDuration);

      // Set up idle detection interval (FAREAST-22)
      idleCheckInterval = setInterval(async () => {
        const idleTime = Date.now() - lastActivityTime;
        if (idleTime > config.voiceAgent.idleTimeout) {
          console.log(`[Voice] Call ${callSid} idle for ${Math.round(idleTime / 1000)}s, prompting customer`);
          realtimeSession.sendMessage({
            role: 'user',
            content: [{
              type: 'input_text',
              text: '[SYSTEM: The customer has been quiet for a while. Ask if they are still there and if they need help completing their order.]'
            }],
          });
          // Reset to avoid repeated prompts
          lastActivityTime = Date.now();
        }
      }, 30000); // Check every 30 seconds
    })
    .catch((err) => {
      console.error('[Voice] OpenAI connection failed:', err.message || err);
      handleAIFailure(callSid, err);
    });
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
 * @param {string|null} callSid - Twilio call SID
 * @param {string|null} scheduledPickupTime - Scheduled pickup time (ISO string)
 */
function logOrderSubmission(orderNumber, phoneNumber, items, totalPrice, callSid, scheduledPickupTime) {
  console.log('[Voice] NEW ORDER SAVED TO DATABASE:');
  console.log(`   Order #: ${orderNumber}`);
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Items (${items.length}):`);
  items.forEach((item, i) => {
    const mods = item.modifications ? ` [${item.modifications}]` : '';
    console.log(`     ${i + 1}. ${item.name} x${item.quantity} @ $${item.price.toFixed(2)}${mods}`);
  });
  console.log(`   Total: $${totalPrice.toFixed(2)}`);
  console.log(`   Pickup: ${scheduledPickupTime ? new Date(scheduledPickupTime).toLocaleTimeString() : 'ASAP (10-15 min)'}`);
  console.log(`   Call SID: ${callSid}`);
  console.log(`   Active calls: ${activeCalls.size}`);
}

/**
 * Broadcasts a new order to connected frontend clients.
 *
 * @param {string} orderNumber - Generated order number
 * @param {string} phoneNumber - Customer phone number
 * @param {Array} items - Array of order items
 * @param {string} notes - Order notes
 * @param {number} totalPrice - Total price
 * @param {string|null} scheduledPickupTime - Scheduled pickup time (ISO string)
 * @returns {Promise<void>}
 */
async function broadcastOrderToFrontend(orderNumber, phoneNumber, items, notes, totalPrice, scheduledPickupTime) {
  await orderBroadcaster.broadcastOrder({
    orderNumber,
    phoneNumber,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      size: item.size || null,
      modifications: item.modifications || '',
    })),
    notes: notes || '',
    time: new Date().toISOString(),
    total: totalPrice,
    status: 'pending',
    scheduledPickupTime: scheduledPickupTime || null,
  });
}

/**
 * Promise-based sleep utility.
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (!config.sms.enabled || !config.sms.fromNumber) {
    console.log('[SMS] SMS notifications disabled (TWILIO_PHONE_NUMBER not set)');
    return;
  }

  // Format phone number for Twilio (add +1 for US if needed)
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `+1${formattedPhone}`;
  } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
    formattedPhone = `+${formattedPhone}`;
  } else {
    formattedPhone = `+${formattedPhone}`;
  }

  // Build item list for SMS
  const itemList = items
    .map((item) => `• ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`)
    .slice(0, 5) // Limit to 5 items to keep SMS short
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
    await withRetry(() => twilioClient.messages.create({
      body: message,
      from: config.sms.fromNumber,
      to: formattedPhone,
    }), { maxRetries: 2, baseDelay: 500 });
    console.log(`[SMS] Confirmation sent to ${formattedPhone} for order ${orderNumber}`);
  } catch (error) {
    console.error(`[SMS] Failed to send confirmation:`, error.message);
    // Don't throw - SMS failure shouldn't block order
  }
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

// Replay any orders that were pending when the server last crashed
replayPendingOrders().catch((err) => console.error('[WAL] Startup replay failed:', err.message));

server.listen(config.ports.voice, () => {
  console.log(`[Voice] Server running on port ${config.ports.voice}`);
});
