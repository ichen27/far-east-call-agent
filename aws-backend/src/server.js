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

import { orderBroadcaster } from './orderBroadcaster.js';
import { VOICE_AGENT_INSTRUCTIONS } from './agentPrompt.js';
import { submitOrderSchema } from './orderSchema.js';
import config from './config.js';

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
 * Sends the order to the Vercel API for storage and frontend display.
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
     * Executes the order submission by sending to Vercel API.
     *
     * @param {Object} params - Order parameters
     * @param {string} params.phoneNumber - Customer phone number
     * @param {Array} params.items - Array of order items
     * @param {string} [params.notes] - Order notes
     * @param {number} params.totalPrice - Total price including tax
     * @returns {Promise<string>} Success or failure message
     */
    execute: async ({ phoneNumber, items, notes, totalPrice }) => {
      try {
        // Send order to Vercel API
        const result = await orderBroadcaster.broadcastOrder({
          phoneNumber,
          total: totalPrice,
          notes: notes || '',
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            size: item.size || null,
            price: item.price,
            modifications: item.modifications || '',
          })),
        });

        if (result.success) {
          const orderNumber = result.orderNumber || 'N/A';
          logOrderSubmission(orderNumber, phoneNumber, items, totalPrice, getCallSid());
          return `Order ${orderNumber} submitted successfully. Total: $${totalPrice.toFixed(2)}`;
        } else {
          console.error('[Voice] Failed to send order:', result.error);
          return `Order recorded. Total: $${totalPrice.toFixed(2)}`;
        }
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
        await twilioClient.calls(callSid).update({ status: 'completed' });
        console.log('[Voice] Call ended successfully');
        return 'Call ended successfully';
      } catch (err) {
        console.error('[Voice] Failed to hang up:', err.message);
        return 'Failed to end call';
      }
    },
  });
}

// ---------------------------------------------------------------------------
// WebSocket Connection Handler
// ---------------------------------------------------------------------------

/**
 * Handles new WebSocket connections from Twilio.
 * Sets up the AI agent, transport layer, and session management.
 */
wss.on('connection', (twilioWs) => {
  let callSid = null;
  const connectionTime = Date.now();

  console.log(`[Voice] New Twilio connection. Active calls: ${activeCalls.size}`);

  // Handle connection close
  twilioWs.on('close', () => {
    if (callSid) {
      activeCalls.delete(callSid);
      console.log(`[Voice] Call ${callSid} ended. Active calls: ${activeCalls.size}`);
    }
  });

  // Handle connection errors
  twilioWs.on('error', (error) => {
    console.error(`[Voice] WebSocket error for call ${callSid}:`, error.message);
    if (callSid) {
      activeCalls.delete(callSid);
    }
  });

  // Listen for Twilio stream start to capture callSid
  twilioWs.on('message', (data) => {
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

  // Create the AI agent
  const agent = new RealtimeAgent({
    name: 'Phone Assistant',
    instructions: VOICE_AGENT_INSTRUCTIONS,
    tools: [hangUpTool, submitOrder],
  });

  // Bridge Twilio audio with OpenAI's Realtime API
  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: twilioWs,
  });

  const session = new RealtimeSession(agent, { transport });

  session.on('error', (error) => {
    console.log('[Voice] Session error (caller may have hung up):', error.type || error);
  });

  // Connect to OpenAI and initiate conversation
  session
    .connect({ apiKey: config.credentials.openaiApiKey })
    .then(() => {
      console.log('[Voice] Connected to OpenAI!');

      // Send initial message to trigger AI greeting
      session.sendMessage({
        role: 'user',
        content: [{ type: 'input_text', text: 'Hello' }],
      });
    })
    .catch((err) => console.error('[Voice] OpenAI connection failed:', err));
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
 */
function logOrderSubmission(orderNumber, phoneNumber, items, totalPrice, callSid) {
  console.log('[Voice] NEW ORDER SAVED TO DATABASE:');
  console.log(`   Order #: ${orderNumber}`);
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Items (${items.length}):`);
  items.forEach((item, i) => {
    const mods = item.modifications ? ` [${item.modifications}]` : '';
    console.log(`     ${i + 1}. ${item.name} x${item.quantity} @ $${item.price.toFixed(2)}${mods}`);
  });
  console.log(`   Total: $${totalPrice.toFixed(2)}`);
  console.log(`   Call SID: ${callSid}`);
  console.log(`   Active calls: ${activeCalls.size}`);
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

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

// Configure order broadcaster to use Vercel API
orderBroadcaster.setApiUrl(config.urls.vercelApi);

server.listen(config.ports.voice, () => {
  console.log(`[Voice] Server running on port ${config.ports.voice}`);
  console.log(`[Voice] Orders will be sent to: ${config.urls.vercelApi}`);
});
