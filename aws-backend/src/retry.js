/**
 * @fileoverview Exponential backoff retry utility for resilient API calls.
 *
 * Provides a generic retry wrapper that handles transient failures from
 * Twilio and OpenAI APIs with jittered exponential backoff to avoid
 * thundering-herd problems during outages.
 *
 * @module retry
 */

/**
 * Executes a function with exponential backoff retry logic.
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} [options] - Retry configuration
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds
 * @param {number} [options.maxDelay=10000] - Maximum delay cap in milliseconds
 * @returns {Promise<*>} Result of the function
 * @throws {Error} The last error after all retries are exhausted
 *
 * @example
 * const result = await withRetry(() => twilioClient.calls(sid).update(...));
 * @example
 * const result = await withRetry(
 *   () => twilioClient.messages.create(...),
 *   { maxRetries: 2, baseDelay: 500 }
 * );
 */
export async function withRetry(fn, { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = delay * 0.2 * Math.random();
      await new Promise(r => setTimeout(r, delay + jitter));
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay + jitter)}ms...`);
    }
  }
}
