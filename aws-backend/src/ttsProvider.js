/**
 * @fileoverview Multi-provider TTS fallback chain for voice failure scenarios.
 *
 * Provides a three-tier fallback for text-to-speech when the primary OpenAI
 * Realtime session is unavailable:
 *
 *   1. ElevenLabs REST API  — natural voice, mulaw/8000 for Twilio
 *   2. Twilio <Say>         — last resort, robotic but always available
 *
 * The primary provider (OpenAI Realtime) handles TTS natively through the
 * session and is not managed here.
 *
 * ElevenLabs audio is served through the existing Express app via a one-time
 * route so Twilio can fetch it via <Play>.
 *
 * @module ttsProvider
 */

import { randomUUID } from 'crypto';
import config from './config.js';

// ---------------------------------------------------------------------------
// In-memory audio store for one-time playback
// ---------------------------------------------------------------------------

/**
 * Temporary store for ElevenLabs-generated audio buffers.
 * Each entry is consumed once and then deleted.
 * @type {Map<string, Buffer>}
 */
const audioStore = new Map();

/**
 * Registers an Express app so that ElevenLabs audio can be served via a
 * one-time GET route at /tts-audio/:id.
 *
 * Must be called once during server setup, before any TTS synthesis.
 *
 * @param {import('express').Application} app - Express app instance
 */
export function registerTTSRoutes(app) {
  app.get('/tts-audio/:id', (req, res) => {
    const audio = audioStore.get(req.params.id);
    if (!audio) {
      res.status(404).send('Not found');
      return;
    }
    // Serve once then remove
    audioStore.delete(req.params.id);
    res.set('Content-Type', 'audio/basic'); // audio/basic = mulaw/8000
    res.send(audio);
  });
}

// ---------------------------------------------------------------------------
// ElevenLabs provider
// ---------------------------------------------------------------------------

/**
 * Synthesizes speech via ElevenLabs and returns a raw mulaw/8000 audio buffer.
 *
 * @param {string} text - Text to synthesize
 * @returns {Promise<Buffer>} Raw mulaw audio buffer
 * @throws {Error} If the ElevenLabs API call fails
 */
async function synthesizeWithElevenLabs(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenlabs.voiceId}/stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': config.elevenlabs.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/basic',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2',
      output_format: 'ulaw_8000',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Synthesizes a failure message using the best available TTS provider.
 *
 * Returns a Buffer (raw mulaw/8000 audio) if ElevenLabs succeeds, or null
 * when only Twilio <Say> is available (no audio buffer to return).
 *
 * @param {string} text - The failure message to synthesize
 * @returns {Promise<Buffer|null>} Audio buffer (ElevenLabs) or null (Twilio Say fallback)
 */
export async function synthesizeFailureMessage(text) {
  if (config.elevenlabs.enabled) {
    try {
      const audio = await synthesizeWithElevenLabs(text);
      console.log(`[TTS] synthesizeFailureMessage: ElevenLabs audio generated (${audio.length} bytes)`);
      return audio;
    } catch (err) {
      console.error('[TTS] synthesizeFailureMessage: ElevenLabs failed, no audio buffer available:', err.message);
    }
  }
  // No audio buffer available — caller should use Twilio <Say>
  return null;
}

/**
 * Builds a complete TwiML <Response> that speaks the given text using the
 * best available TTS provider.
 *
 * - If ElevenLabs is configured and succeeds: stores audio in the in-memory
 *   store and returns a <Play> URL pointing to /tts-audio/:id.
 * - Otherwise falls back to a Twilio <Say> verb.
 *
 * @param {string} text - Text to convert to speech
 * @param {string} baseUrl - Public base URL of this server (e.g. 'https://example.ngrok.io')
 * @param {string} [suffix=''] - Additional TwiML verbs to append after the speech
 * @returns {Promise<string>} Complete TwiML <Response> string
 *
 * @example
 * const twiml = await buildTwimlWithTTS(
 *   "Please hold.",
 *   "https://my-server.ngrok.io",
 *   '<Dial>+15551234567</Dial>'
 * );
 * await twilioClient.calls(callSid).update({ twiml });
 */
export async function buildTwimlWithTTS(text, baseUrl, suffix = '') {
  // --- Attempt 1: ElevenLabs ---
  if (config.elevenlabs.enabled) {
    try {
      const audio = await synthesizeWithElevenLabs(text);
      const id = randomUUID();
      audioStore.set(id, audio);

      // Auto-expire after 60 seconds in case Twilio never fetches it
      setTimeout(() => audioStore.delete(id), 60_000);

      const playUrl = `${baseUrl}/tts-audio/${id}`;
      console.log(`[TTS] ElevenLabs audio ready at ${playUrl}`);
      return `<Response><Play>${playUrl}</Play>${suffix}</Response>`;
    } catch (err) {
      console.error('[TTS] ElevenLabs failed, falling back to Twilio Say:', err.message);
    }
  }

  // --- Attempt 2: Twilio <Say> (last resort) ---
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  console.log('[TTS] Using Twilio Say fallback');
  return `<Response><Say voice="Polly.Joanna">${escaped}</Say>${suffix}</Response>`;
}
