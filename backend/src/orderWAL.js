/**
 * @fileoverview Write-Ahead Log (WAL) for order durability.
 *
 * Before each order is written to SQLite, it is appended to a JSONL file.
 * After the DB write succeeds, the WAL entry is marked "committed".
 * On startup, any "pending" entries are replayed to ensure no orders are lost
 * during crashes or DB failures.
 *
 * @module orderWAL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Path to the WAL file (same directory as the database) */
const WAL_PATH = path.join(__dirname, 'orders.wal.jsonl');

/**
 * Appends a pending order entry to the WAL file.
 *
 * @param {string} walId - Unique ID for this WAL entry (used to commit it later)
 * @param {Object} orderData - The order data that is about to be written to DB
 * @returns {void}
 */
export function walAppendPending(walId, orderData) {
  const entry = {
    walId,
    timestamp: new Date().toISOString(),
    data: orderData,
    status: 'pending',
  };
  try {
    fs.appendFileSync(WAL_PATH, JSON.stringify(entry) + '\n', 'utf8');
    console.log(`[WAL] Appended pending entry ${walId}`);
  } catch (err) {
    // WAL write failure is non-fatal — log and continue
    console.error(`[WAL] Failed to append pending entry ${walId}:`, err.message);
  }
}

/**
 * Marks a WAL entry as committed by rewriting the file with the updated status.
 *
 * For simplicity we rewrite the whole file. In high-volume production you'd
 * use an append-only approach, but for a restaurant this is fast enough.
 *
 * @param {string} walId - The WAL entry ID to commit
 * @returns {void}
 */
export function walCommit(walId) {
  try {
    if (!fs.existsSync(WAL_PATH)) return;

    const lines = fs.readFileSync(WAL_PATH, 'utf8').split('\n').filter(Boolean);
    const updated = lines.map((line) => {
      try {
        const entry = JSON.parse(line);
        if (entry.walId === walId) {
          return JSON.stringify({ ...entry, status: 'committed', committedAt: new Date().toISOString() });
        }
        return line;
      } catch {
        return line;
      }
    });

    fs.writeFileSync(WAL_PATH, updated.join('\n') + '\n', 'utf8');
    console.log(`[WAL] Committed entry ${walId}`);
  } catch (err) {
    console.error(`[WAL] Failed to commit entry ${walId}:`, err.message);
  }
}

/**
 * Reads all entries from the WAL file.
 *
 * @returns {Array<Object>} Parsed WAL entries
 */
function readWAL() {
  if (!fs.existsSync(WAL_PATH)) return [];
  try {
    const lines = fs.readFileSync(WAL_PATH, 'utf8').split('\n').filter(Boolean);
    return lines.map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    console.error('[WAL] Failed to read WAL file:', err.message);
    return [];
  }
}

/**
 * Replays any pending WAL entries on server startup to ensure no orders are lost.
 *
 * Imports createOrderAtomic lazily to avoid circular dependencies.
 * Each replayed order is committed in the WAL after successful DB write.
 *
 * @returns {Promise<void>}
 */
export async function replayPendingOrders() {
  const entries = readWAL();
  const pending = entries.filter((e) => e.status === 'pending');

  if (pending.length === 0) {
    console.log('[WAL] No pending orders to replay');
    return;
  }

  console.log(`[WAL] Replaying ${pending.length} pending order(s)...`);

  // Lazy import to avoid circular dependency
  const { createOrderAtomic } = await import('./database.js');

  for (const entry of pending) {
    try {
      const { orderNumber } = createOrderAtomic(entry.data);
      walCommit(entry.walId);
      console.log(`[WAL] Replayed order ${orderNumber} (walId: ${entry.walId})`);
    } catch (err) {
      console.error(`[WAL] Failed to replay walId ${entry.walId}:`, err.message);
      // Leave as pending — will retry on next restart
    }
  }
}

/**
 * Generates a unique WAL entry ID.
 *
 * @returns {string} A unique ID string
 */
export function generateWalId() {
  return `wal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
