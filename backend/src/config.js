/**
 * @fileoverview Centralized configuration for the Far East Restaurant backend services.
 *
 * This module provides a single source of truth for all configuration values,
 * including server ports, external URLs, and service settings. Environment
 * variables take precedence over default values.
 *
 * @module config
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates that required environment variables are present.
 * Logs warnings for missing optional variables.
 *
 * @param {string[]} required - List of required environment variable names
 * @param {string[]} optional - List of optional environment variable names
 */
function validateEnvVars(required, optional) {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('[Config] Missing required environment variables:', missing.join(', '));
    console.error('[Config] Please check your .env file');
  }

  // Log status for all variables
  [...required, ...optional].forEach((key) => {
    const status = process.env[key] ? 'Yes' : 'No';
    console.log(`[Config] ${key} loaded: ${status}`);
  });
}

// Validate environment variables on module load
validateEnvVars(
  ['OPENAI_API_KEY'],
  ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN']
);

/**
 * Server port configuration.
 * @constant {Object}
 */
export const ports = {
  /** Voice agent server port (Twilio WebSocket) */
  voice: parseInt(process.env.VOICE_PORT, 10) || 3000,

  /** Chat agent server port (HTTP/REST) */
  chat: parseInt(process.env.CHAT_PORT, 10) || 3001,

  /** WebSocket server port (frontend real-time updates) */
  socket: parseInt(process.env.SOCKET_PORT, 10) || 8080,
};

/**
 * External service URLs.
 * @constant {Object}
 */
export const urls = {
  /** WebSocket URL for Twilio media stream connection */
  twilioMediaStream: process.env.TWILIO_MEDIA_STREAM_URL || 'wss://fe-local-call.fareastbackend.us/media-stream',
};

/**
 * API keys and credentials.
 * @constant {Object}
 */
export const credentials = {
  /** OpenAI API key for AI agents */
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  /** Twilio Account SID for phone integration */
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',

  /** Twilio Auth Token for phone integration */
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
};

/**
 * Chat agent configuration.
 * @constant {Object}
 */
export const chatAgent = {
  /** OpenAI model to use for chat */
  model: process.env.CHAT_MODEL || 'gpt-4o',

  /** Maximum conversation turns per request */
  maxTurns: parseInt(process.env.CHAT_MAX_TURNS, 10) || 5,

  /** Maximum number of sessions to keep in memory */
  maxSessions: parseInt(process.env.MAX_SESSIONS, 10) || 100,

  /** Session cleanup interval in milliseconds (30 minutes) */
  sessionCleanupInterval: 30 * 60 * 1000,
};

/**
 * Voice agent configuration.
 * @constant {Object}
 */
export const voiceAgent = {
  /** Delay before hanging up after agent requests (milliseconds) */
  hangUpDelay: parseInt(process.env.HANGUP_DELAY, 10) || 5000,
};

/**
 * Database configuration.
 * @constant {Object}
 */
export const database = {
  /** SQLite database file path */
  path: process.env.DB_PATH || 'fareast.db',

  /** Busy timeout for concurrent access (milliseconds) */
  busyTimeout: parseInt(process.env.DB_BUSY_TIMEOUT, 10) || 5000,
};

/**
 * Restaurant information.
 * @constant {Object}
 */
export const restaurant = {
  name: 'Far East Chinese Restaurant',
  address: '125 Main Street, Binghamton, N.Y. 13905',
  phone: '(607) 797-1166 / 5576',
  hours: {
    weekday: '11:00 am - 10:30 pm',
    weekend: '11:00 am - 11:00 pm',
    closed: 'Sunday',
  },
  estimatedPickupTime: '10-15 minutes',
};

/**
 * Full configuration object for convenience.
 * @constant {Object}
 */
const config = {
  ports,
  urls,
  credentials,
  chatAgent,
  voiceAgent,
  database,
  restaurant,
};

export default config;
