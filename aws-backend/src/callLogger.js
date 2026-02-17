/**
 * @fileoverview Structured call event logger for Far East Restaurant voice agent.
 *
 * Appends JSON lines to calls.log.jsonl. Each entry contains:
 * { timestamp, callSid, event, data, duration }
 *
 * @module callLogger
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '..', '..', 'calls.log.jsonl');

/**
 * Appends a structured call event as a JSON line to calls.log.jsonl.
 *
 * @param {string} callSid - Twilio call SID
 * @param {string} event - Event name (e.g. 'call_start', 'call_end', 'order_placed', 'transfer', 'ai_failure')
 * @param {Object} [data={}] - Additional event data
 * @param {number} [duration] - Call duration in seconds (relevant for call_end)
 */
export function logCallEvent(callSid, event, data = {}, duration) {
  const entry = {
    timestamp: new Date().toISOString(),
    callSid: callSid || null,
    event,
    data,
    ...(duration !== undefined && { duration }),
  };

  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Log to stderr but never throw — logging must not interrupt call flow
    console.error('[CallLogger] Failed to write log entry:', err.message);
  }
}
