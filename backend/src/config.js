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
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
dotenv.config();

// Get directory path for file path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  /** Maximum call duration in milliseconds (default: 10 minutes) */
  maxCallDuration: parseInt(process.env.MAX_CALL_DURATION, 10) || 10 * 60 * 1000,

  /** Warning time before call ends in milliseconds (default: 1 minute before max) */
  callTimeoutWarning: parseInt(process.env.CALL_TIMEOUT_WARNING, 10) || 9 * 60 * 1000,

  /** Idle timeout - end call if no activity for this duration (default: 2 minutes) */
  idleTimeout: parseInt(process.env.IDLE_TIMEOUT, 10) || 2 * 60 * 1000,
};

/**
 * Database configuration (FAREAST-21: Optimized for 50 concurrent calls).
 *
 * SQLite with WAL mode can handle many concurrent readers with one writer.
 * These settings are optimized for high-concurrency restaurant order taking:
 * - WAL mode: Multiple readers, single writer without blocking
 * - Busy timeout: Wait for locks instead of failing immediately
 * - Large cache: Reduces disk I/O for repeated queries
 * - Memory-mapped I/O: Faster reads through OS page cache
 *
 * @constant {Object}
 */
export const database = {
  /** SQLite database file path (absolute path resolved from config directory) */
  path: process.env.DB_PATH || join(__dirname, 'fareast.db'),

  /** Busy timeout for concurrent access (milliseconds) - handles write contention */
  busyTimeout: parseInt(process.env.DB_BUSY_TIMEOUT, 10) || 5000,

  /** Cache size in KB (negative = KB, positive = pages). 64MB for frequent queries */
  cacheSize: parseInt(process.env.DB_CACHE_SIZE, 10) || -64000,

  /** Memory-mapped I/O size in bytes. 256MB for fast reads */
  mmapSize: parseInt(process.env.DB_MMAP_SIZE, 10) || 268435456,
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
 * SMS notification configuration.
 * @constant {Object}
 */
export const sms = {
  /** Twilio phone number to send SMS from */
  fromNumber: process.env.TWILIO_PHONE_NUMBER || '',

  /** Whether SMS confirmations are enabled */
  enabled: process.env.SMS_ENABLED === 'true' || !!process.env.TWILIO_PHONE_NUMBER,
};

/**
 * Call transfer configuration (FAREAST-4).
 * @constant {Object}
 */
export const callTransfer = {
  /** Staff phone number to transfer calls to when customer requests human */
  staffPhoneNumber: process.env.STAFF_PHONE_NUMBER || '',

  /** Whether call transfer is enabled */
  enabled: !!process.env.STAFF_PHONE_NUMBER,

  /** Timeout in seconds to wait for staff to answer (default: 30s) */
  timeout: parseInt(process.env.TRANSFER_TIMEOUT, 10) || 30,
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
  sms,
  callTransfer,
};

export default config;
