/**
 * database.js - Centralized database module with concurrency-safe operations
 *
 * This module provides a single shared database connection and atomic operations
 * optimized for handling 5+ concurrent voice agent calls.
 *
 * OPTIMIZATIONS:
 * 1. WAL mode - allows multiple readers with one writer
 * 2. Foreign key enforcement - data integrity
 * 3. Busy timeout - prevents SQLITE_BUSY errors under load
 * 4. Optimized cache - better read performance
 * 5. NORMAL synchronous - good balance of safety and speed with WAL
 * 6. Memory-mapped I/O - faster reads
 * 7. Atomic transactions - prevents race conditions in order creation
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Single shared database connection
const db = new Database(join(__dirname, 'fareast.db'));

// ==================== CRITICAL PRAGMAS FOR CONCURRENCY ====================

// Enable WAL mode for better concurrent write performance
// WAL allows multiple readers and one writer simultaneously
// Critical for handling 5+ concurrent phone calls
db.pragma('journal_mode = WAL');

// Enable foreign key enforcement
// SQLite has foreign keys disabled by default for backwards compatibility
db.pragma('foreign_keys = ON');

// Set busy timeout to 5 seconds for concurrent access
// When the database is locked by another writer, wait up to 5000ms
// before returning SQLITE_BUSY error
db.pragma('busy_timeout = 5000');

// ==================== PERFORMANCE PRAGMAS ====================

// Optimize cache size (negative value = KB, so -64000 = 64MB)
// Larger cache improves read performance for repeated queries
db.pragma('cache_size = -64000');

// Set synchronous to NORMAL for better write performance with WAL
// NORMAL is safe with WAL mode and provides good durability
// (FULL would sync after every transaction, slower but safest)
db.pragma('synchronous = NORMAL');

// Enable memory-mapped I/O for better read performance (256MB)
// Allows the OS to map the database file into memory
db.pragma('mmap_size = 268435456');

// Store temp tables in memory for better performance
db.pragma('temp_store = MEMORY');

// Log database configuration on startup
console.log('[Database] Connection established with optimized settings:');
console.log('  - journal_mode:', db.pragma('journal_mode', { simple: true }));
console.log('  - foreign_keys:', db.pragma('foreign_keys', { simple: true }));
console.log('  - busy_timeout:', db.pragma('busy_timeout', { simple: true }), 'ms');
console.log('  - synchronous:', db.pragma('synchronous', { simple: true }));
console.log('  - cache_size:', db.pragma('cache_size', { simple: true }));

/**
 * Atomically generate an order number and insert the order in a single transaction.
 * This prevents race conditions where two concurrent callers could get the same order number.
 *
 * Uses SQLite's MAX() + INSERT in a transaction to guarantee uniqueness.
 *
 * @param {Object} orderData - The order data
 * @param {string} orderData.phoneNumber - Customer phone number
 * @param {number} orderData.totalPrice - Total price of order
 * @param {string} orderData.notes - Order notes
 * @param {Array} orderData.items - Array of order items
 * @returns {Object} - { orderId, orderNumber } or throws on error
 */
export function createOrderAtomic(orderData) {
  const { phoneNumber, totalPrice, notes, items } = orderData;

  // Use a transaction to make the entire operation atomic
  const createOrder = db.transaction(() => {
    const today = new Date().toISOString().slice(0, 10);

    // Get the next order number atomically within the transaction
    // Using MAX ensures we get the highest existing number even if there are gaps
    const maxResult = db.prepare(`
      SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) as max_num
      FROM orders
      WHERE DATE(created_at) = DATE(?)
    `).get(today);

    const orderNumber = (maxResult.max_num + 1).toString();

    // Insert the order
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, phone_number, status, order_type, total, notes)
      VALUES (?, ?, 'pending', 'pickup', ?, ?)
    `);

    const orderResult = insertOrder.run(
      orderNumber,
      phoneNumber,
      totalPrice,
      notes || ''
    );

    const orderId = orderResult.lastInsertRowid;

    // Prepare statement for items (reused for efficiency)
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, size, unit_price, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Find menu item by name (optional - helps link to menu)
    const findMenuItem = db.prepare(`
      SELECT id FROM menu_items WHERE name LIKE ? LIMIT 1
    `);

    // Insert all items
    for (const item of items) {
      const menuItem = findMenuItem.get(`%${item.name}%`);
      const menuItemId = menuItem ? menuItem.id : null;
      const lineTotal = item.quantity * item.price;

      insertItem.run(
        orderId,
        menuItemId,
        item.name,
        item.quantity,
        item.size || null,
        item.price,
        lineTotal,
        item.modifications || ''
      );
    }

    return { orderId, orderNumber };
  });

  // Execute the transaction - SQLite ensures this is atomic
  // If any statement fails, the entire transaction is rolled back
  return createOrder();
}

/**
 * Get all orders with their items
 * @returns {Array} - Array of orders with items
 */
export function getAllOrders() {
  const orders = db.prepare(`
    SELECT id, order_number, phone_number, status, order_type, total, notes, created_at
    FROM orders
    ORDER BY created_at DESC
  `).all();

  const getItems = db.prepare(`
    SELECT item_name, quantity, size, notes as modifications
    FROM order_items
    WHERE order_id = ?
  `);

  return orders.map(order => ({
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status,
    items: getItems.all(order.id).map(item => ({
      name: item.item_name,
      quantity: item.quantity,
      size: item.size || null,
      modifications: item.modifications || ''
    })),
    notes: order.notes || '',
    time: order.created_at,
    date: order.created_at ? order.created_at.split('T')[0] : null,
    total: order.total
  }));
}

/**
 * Update order status
 * @param {string} orderNumber - The order number to update
 * @param {string} status - New status
 * @returns {boolean} - True if updated, false if not found
 */
export function updateOrderStatus(orderNumber, status) {
  const updateStmt = db.prepare(`
    UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE order_number = ?
  `);

  const result = updateStmt.run(status, orderNumber);
  return result.changes > 0;
}

/**
 * Find menu item by name
 * @param {string} name - Item name to search
 * @returns {Object|null} - Menu item or null
 */
export function findMenuItemByName(name) {
  return db.prepare(`
    SELECT id FROM menu_items WHERE name LIKE ? LIMIT 1
  `).get(`%${name}%`);
}

/**
 * Get order count for today (used for statistics)
 * @returns {number} - Count of orders today
 */
export function getTodayOrderCount() {
  const today = new Date().toISOString().slice(0, 10);
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE DATE(created_at) = DATE(?)
  `).get(today);
  return result.count;
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase() {
  if (db && db.open) {
    // Checkpoint WAL file before closing for clean shutdown
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      // Ignore checkpoint errors
    }
    db.close();
    console.log('[Database] Connection closed gracefully');
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

// Export the raw db for cases where direct access is needed
// (use sparingly - prefer the atomic functions above)
export { db };
