/**
 * @fileoverview Audio noise filtering for incoming Twilio media stream frames.
 *
 * Provides a noise gate (amplitude threshold gating) and a simple high-pass
 * filter to suppress low-frequency rumble and background noise before audio
 * is passed to the AI speech pipeline.
 *
 * @module noiseFilter
 */

import { audioProcessing } from './config.js';

const { noiseGateThreshold } = audioProcessing;

/**
 * Noise gate that silences audio frames whose peak amplitude falls below a
 * configurable threshold.  Frames that are too quiet are replaced with zeroes
 * so downstream consumers receive clean silence instead of low-level noise.
 */
export class NoiseGate {
  /**
   * @param {number} [threshold=noiseGateThreshold] - Amplitude threshold (0-32767 for 16-bit PCM).
   *   Frames with a peak amplitude below this value are gated (zeroed out).
   */
  constructor(threshold = noiseGateThreshold) {
    this.threshold = threshold;
  }

  /**
   * Applies the noise gate to a signed 16-bit little-endian PCM buffer.
   *
   * @param {Buffer} buffer - Raw PCM audio frame.
   * @returns {Buffer} The original buffer if above threshold, or a zero-filled
   *   buffer of the same length if below threshold.
   */
  process(buffer) {
    const peak = this._peakAmplitude(buffer);
    if (peak < this.threshold) {
      return Buffer.alloc(buffer.length, 0);
    }
    return buffer;
  }

  /**
   * Computes the peak absolute amplitude from a signed 16-bit LE PCM buffer.
   *
   * @param {Buffer} buffer
   * @returns {number} Peak amplitude (0-32767).
   */
  _peakAmplitude(buffer) {
    let peak = 0;
    for (let i = 0; i + 1 < buffer.length; i += 2) {
      const sample = Math.abs(buffer.readInt16LE(i));
      if (sample > peak) peak = sample;
    }
    return peak;
  }
}

/**
 * First-order IIR high-pass filter.  Attenuates frequencies below a cutoff
 * so that low-frequency rumble (HVAC, line hum) is reduced without affecting
 * speech intelligibility.
 *
 * Transfer function: y[n] = α * (y[n-1] + x[n] - x[n-1])
 * where α = RC / (RC + dt) and RC = 1 / (2π * cutoffHz).
 */
export class HighPassFilter {
  /**
   * @param {number} [sampleRate=8000] - Sample rate in Hz (Twilio uses 8 kHz μ-law, resampled to PCM).
   * @param {number} [cutoffHz=80]     - -3 dB cutoff frequency in Hz.
   */
  constructor(sampleRate = 8000, cutoffHz = 80) {
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / sampleRate;
    this._alpha = rc / (rc + dt);
    this._prevInput = 0;
    this._prevOutput = 0;
  }

  /**
   * Filters a signed 16-bit LE PCM buffer in-place and returns a new buffer.
   *
   * @param {Buffer} buffer - Raw PCM audio frame.
   * @returns {Buffer} High-pass filtered PCM buffer (same length, 16-bit LE).
   */
  process(buffer) {
    const out = Buffer.allocUnsafe(buffer.length);
    for (let i = 0; i + 1 < buffer.length; i += 2) {
      const x = buffer.readInt16LE(i);
      const y = this._alpha * (this._prevOutput + x - this._prevInput);
      const clamped = Math.max(-32768, Math.min(32767, Math.round(y)));
      out.writeInt16LE(clamped, i);
      this._prevInput = x;
      this._prevOutput = y;
    }
    return out;
  }
}

// Module-level filter instances (stateful across frames for a single stream).
const _gate = new NoiseGate();
const _hpf = new HighPassFilter();

/**
 * Processes a single audio frame through the high-pass filter then the noise
 * gate.  This is the primary entry point for the media stream pipeline.
 *
 * Processing order:
 *   1. High-pass filter  — removes low-frequency noise
 *   2. Noise gate        — silences frames that are still too quiet
 *
 * @param {Buffer} buffer - Raw signed 16-bit LE PCM audio frame from Twilio.
 * @returns {Buffer} Processed PCM buffer, ready for the AI speech pipeline.
 */
export function processAudioFrame(buffer) {
  const filtered = _hpf.process(buffer);
  return _gate.process(filtered);
}
