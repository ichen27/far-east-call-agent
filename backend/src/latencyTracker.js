/**
 * @fileoverview Production latency monitoring for the voice agent.
 *
 * Tracks the time from user speech end → agent response start for each call.
 * Stores the last 100 measurements in a ring buffer and exposes percentile
 * statistics via an Express-mountable router.
 *
 * @module latencyTracker
 */

import express from 'express';

// ---------------------------------------------------------------------------
// Ring Buffer
// ---------------------------------------------------------------------------

const RING_SIZE = 100;

/** @type {number[]} Circular buffer of latency samples in milliseconds */
const latencyBuffer = [];

/** Total calls that produced at least one latency sample */
let callCount = 0;

/** Total error count (fatal session errors, not caller hang-ups) */
let errorCount = 0;

// ---------------------------------------------------------------------------
// Per-Call State
// ---------------------------------------------------------------------------

/**
 * Map tracking in-progress latency measurement windows.
 * Key: callSid — Value: timestamp when user speech ended (ms)
 *
 * @type {Map<string, number>}
 */
const pendingLatency = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Records the moment user speech ended (input_audio_buffer.speech_stopped event).
 *
 * @param {string} callSid - Twilio call SID
 */
export function recordSpeechEnd(callSid) {
  pendingLatency.set(callSid, Date.now());
}

/**
 * Records the moment the agent started responding (response.created event).
 * Calculates latency and adds it to the ring buffer.
 *
 * @param {string} callSid - Twilio call SID
 */
export function recordResponseStart(callSid) {
  const speechEndTime = pendingLatency.get(callSid);
  if (speechEndTime === undefined) return; // No matching speech_end

  const latencyMs = Date.now() - speechEndTime;
  pendingLatency.delete(callSid);

  // Ring buffer — evict oldest if full
  if (latencyBuffer.length >= RING_SIZE) {
    latencyBuffer.shift();
  }
  latencyBuffer.push(latencyMs);
  callCount++;

  console.log(`[Latency] ${callSid}: ${latencyMs}ms (${latencyBuffer.length} samples)`);
}

/**
 * Clears pending state for a call that has ended.
 *
 * @param {string} callSid - Twilio call SID
 */
export function clearCallLatency(callSid) {
  pendingLatency.delete(callSid);
}

/**
 * Increments the global error counter.
 * Call this when a fatal session error occurs (not just a hang-up).
 */
export function recordError() {
  errorCount++;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * Computes a percentile value from a sorted array.
 *
 * @param {number[]} sorted - Ascending-sorted numbers
 * @param {number} p - Percentile (0–100)
 * @returns {number} Percentile value rounded to nearest integer
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
}

/**
 * Computes latency statistics from the current ring buffer.
 *
 * @returns {{p50: number, p95: number, p99: number, avg: number, callCount: number, errorRate: number}}
 */
export function getMetrics() {
  if (latencyBuffer.length === 0) {
    return {
      p50: 0,
      p95: 0,
      p99: 0,
      avg: 0,
      callCount,
      errorRate: callCount > 0 ? parseFloat((errorCount / callCount).toFixed(4)) : 0,
      sampleCount: 0,
    };
  }

  const sorted = [...latencyBuffer].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);

  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    avg,
    callCount,
    errorRate: callCount > 0 ? parseFloat((errorCount / callCount).toFixed(4)) : 0,
    sampleCount: latencyBuffer.length,
  };
}

// ---------------------------------------------------------------------------
// Express Router
// ---------------------------------------------------------------------------

/**
 * Express router exposing the /metrics endpoint.
 * Mount with: `app.use(metricsRouter)`
 *
 * @type {express.Router}
 */
export const metricsRouter = express.Router();

metricsRouter.get('/metrics', (_req, res) => {
  res.json(getMetrics());
});
