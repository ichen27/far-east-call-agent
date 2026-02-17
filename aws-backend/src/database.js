/**
 * database.js - Centralized database module with concurrency-safe operations
 *
 * This module provides a single shared database connection and atomic operations
 * optimized for handling 50+ concurrent voice agent calls (FAREAST-21).
 *
 * CONCURRENCY ARCHITECTURE:
 * SQLite with WAL (Write-Ahead Logging) mode supports high concurrency:
 * - Multiple concurrent readers (unlimited)
 * - Single writer at a time (with queuing)
 * - Readers don't block writers, writers don't block readers
 *
 * OPTIMIZATIONS FOR 50 CONCURRENT CALLS:
 * 1. WAL mode - allows multiple readers with one writer (non-blocking reads)
 * 2. Busy timeout 5000ms - queues writes instead of failing immediately
 * 3. Large cache (64MB) - reduces disk I/O for repeated queries
 * 4. Memory-mapped I/O (256MB) - faster reads through OS page cache
 * 5. NORMAL synchronous - good durability with WAL without blocking
 * 6. Atomic transactions - prevents race conditions in order creation
 * 7. Foreign key enforcement - data integrity
 *
 * CAPACITY NOTES:
 * - Each voice call creates ~2-3 DB writes (order + items)
 * - Read operations (menu queries) are non-blocking
 * - With 5000ms busy timeout, writes queue for up to 5 seconds
 * - Typical order insertion takes <10ms, so 50 concurrent is safe
 */

import Database from 'better-sqlite3';
import config from './config.js';

// Single shared database connection using centralized config
const db = new Database(config.database.path);

// ==================== CRITICAL PRAGMAS FOR CONCURRENCY ====================

// Enable WAL mode for better concurrent write performance
// WAL allows multiple readers and one writer simultaneously
// Critical for handling 5+ concurrent phone calls
db.pragma('journal_mode = WAL');

// Enable foreign key enforcement
// SQLite has foreign keys disabled by default for backwards compatibility
db.pragma('foreign_keys = ON');

// Set busy timeout for concurrent access (configurable via DB_BUSY_TIMEOUT)
// When the database is locked by another writer, wait before returning SQLITE_BUSY
db.pragma(`busy_timeout = ${config.database.busyTimeout}`);

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
 * @param {string} [orderData.scheduledPickupTime] - Scheduled pickup time (ISO string) or null for ASAP
 * @returns {Object} - { orderId, orderNumber } or throws on error
 */
export function createOrderAtomic(orderData) {
  const { phoneNumber, totalPrice, notes, items, scheduledPickupTime } = orderData;

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

    // Insert the order with optional scheduled pickup time (FAREAST-33)
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, phone_number, status, order_type, total, notes, scheduled_pickup_time)
      VALUES (?, ?, 'pending', 'pickup', ?, ?, ?)
    `);

    const orderResult = insertOrder.run(
      orderNumber,
      phoneNumber,
      totalPrice,
      notes || '',
      scheduledPickupTime || null
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
    SELECT id, order_number, phone_number, status, order_type, total, notes, created_at, scheduled_pickup_time
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
    total: order.total,
    scheduledPickupTime: order.scheduled_pickup_time || null
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

// ---------------------------------------------------------------------------
// Order Lookup and Modification Functions (FAREAST-5)
// ---------------------------------------------------------------------------

/**
 * Look up orders by phone number (for returning customers)
 * Returns pending/confirmed orders that can still be modified
 *
 * @param {string} phoneNumber - Customer phone number
 * @returns {Array} - Array of modifiable orders with items
 */
export function getOrdersByPhoneNumber(phoneNumber) {
  // Normalize phone number by removing non-digits
  const normalizedPhone = phoneNumber.replace(/\D/g, '');

  // Get orders from today that are still modifiable (pending or confirmed)
  const orders = db.prepare(`
    SELECT id, order_number, phone_number, status, total, notes, created_at, scheduled_pickup_time
    FROM orders
    WHERE REPLACE(REPLACE(REPLACE(phone_number, '-', ''), '(', ''), ')', '') LIKE ?
      AND status IN ('pending', 'confirmed')
      AND DATE(created_at) = DATE('now', 'localtime')
    ORDER BY created_at DESC
  `).all(`%${normalizedPhone}%`);

  const getItems = db.prepare(`
    SELECT id, item_name, quantity, size, unit_price, notes as modifications
    FROM order_items
    WHERE order_id = ?
  `);

  return orders.map(order => ({
    orderId: order.id,
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status,
    total: order.total,
    notes: order.notes || '',
    createdAt: order.created_at,
    scheduledPickupTime: order.scheduled_pickup_time || null,
    items: getItems.all(order.id).map(item => ({
      itemId: item.id,
      name: item.item_name,
      quantity: item.quantity,
      size: item.size || null,
      price: item.unit_price,
      modifications: item.modifications || ''
    }))
  }));
}

/**
 * Add an item to an existing order
 *
 * @param {string} orderNumber - The order number
 * @param {Object} item - Item to add { name, quantity, size, price, modifications }
 * @returns {Object} - { success, newTotal, message }
 */
export function addItemToOrder(orderNumber, item) {
  const addItem = db.transaction(() => {
    // Find the order
    const order = db.prepare(`
      SELECT id, status, total FROM orders
      WHERE order_number = ? AND status IN ('pending', 'confirmed')
    `).get(orderNumber);

    if (!order) {
      return { success: false, message: 'Order not found or cannot be modified' };
    }

    // Find menu item by name (optional)
    const menuItem = db.prepare(`
      SELECT id FROM menu_items WHERE name LIKE ? LIMIT 1
    `).get(`%${item.name}%`);

    const menuItemId = menuItem ? menuItem.id : null;
    const lineTotal = item.quantity * item.price;

    // Insert the new item
    db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, size, unit_price, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.id,
      menuItemId,
      item.name,
      item.quantity,
      item.size || null,
      item.price,
      lineTotal,
      item.modifications || ''
    );

    // Update order total
    const newTotal = order.total + lineTotal;
    db.prepare(`
      UPDATE orders SET total = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newTotal, order.id);

    return { success: true, newTotal, message: `Added ${item.quantity}x ${item.name} to order ${orderNumber}` };
  });

  return addItem();
}

/**
 * Remove an item from an existing order
 *
 * @param {string} orderNumber - The order number
 * @param {string} itemName - Name of item to remove (partial match)
 * @param {number} [quantity] - Quantity to remove (null = remove all of that item)
 * @returns {Object} - { success, newTotal, message }
 */
export function removeItemFromOrder(orderNumber, itemName, quantity = null) {
  const removeItem = db.transaction(() => {
    // Find the order
    const order = db.prepare(`
      SELECT id, status, total FROM orders
      WHERE order_number = ? AND status IN ('pending', 'confirmed')
    `).get(orderNumber);

    if (!order) {
      return { success: false, message: 'Order not found or cannot be modified' };
    }

    // Find the item in the order
    const orderItem = db.prepare(`
      SELECT id, item_name, quantity, unit_price
      FROM order_items
      WHERE order_id = ? AND LOWER(item_name) LIKE LOWER(?)
      LIMIT 1
    `).get(order.id, `%${itemName}%`);

    if (!orderItem) {
      return { success: false, message: `Item "${itemName}" not found in order` };
    }

    const qtyToRemove = quantity || orderItem.quantity;
    const priceReduction = qtyToRemove * orderItem.unit_price;

    if (qtyToRemove >= orderItem.quantity) {
      // Remove the entire item
      db.prepare(`DELETE FROM order_items WHERE id = ?`).run(orderItem.id);
    } else {
      // Reduce quantity
      const newQty = orderItem.quantity - qtyToRemove;
      db.prepare(`
        UPDATE order_items SET quantity = ?, total = ? WHERE id = ?
      `).run(newQty, newQty * orderItem.unit_price, orderItem.id);
    }

    // Update order total
    const newTotal = Math.max(0, order.total - priceReduction);
    db.prepare(`
      UPDATE orders SET total = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newTotal, order.id);

    return {
      success: true,
      newTotal,
      message: `Removed ${qtyToRemove}x ${orderItem.item_name} from order ${orderNumber}`
    };
  });

  return removeItem();
}

/**
 * Cancel an order entirely
 *
 * @param {string} orderNumber - The order number to cancel
 * @returns {Object} - { success, message }
 */
export function cancelOrder(orderNumber) {
  const order = db.prepare(`
    SELECT id, status FROM orders
    WHERE order_number = ? AND status IN ('pending', 'confirmed')
  `).get(orderNumber);

  if (!order) {
    return { success: false, message: 'Order not found or cannot be cancelled' };
  }

  db.prepare(`
    UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(order.id);

  return { success: true, message: `Order ${orderNumber} has been cancelled` };
}

// ---------------------------------------------------------------------------
// Menu Management Functions (FAREAST-31)
// ---------------------------------------------------------------------------

/**
 * Get all menu items
 * @returns {Array} - All menu items
 */
export function getAllMenuItems() {
  return db.prepare(`
    SELECT id, item_number, name, description, price_small, price_large, price_single,
           included, category, is_spicy
    FROM menu_items
    ORDER BY category, item_number
  `).all();
}

/**
 * Get menu item by ID
 * @param {number} id - Menu item ID
 * @returns {Object|null} - Menu item or null
 */
export function getMenuItemById(id) {
  return db.prepare(`
    SELECT id, item_number, name, description, price_small, price_large, price_single,
           included, category, is_spicy
    FROM menu_items WHERE id = ?
  `).get(id);
}

/**
 * Create a new menu item
 * @param {Object} item - Menu item data
 * @returns {Object} - { success, id, message }
 */
export function createMenuItem(item) {
  try {
    const result = db.prepare(`
      INSERT INTO menu_items (item_number, name, description, price_small, price_large, price_single, included, category, is_spicy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.item_number || null,
      item.name,
      item.description || null,
      item.price_small || null,
      item.price_large || null,
      item.price_single || null,
      item.included || null,
      item.category,
      item.is_spicy || 0
    );
    return { success: true, id: result.lastInsertRowid, message: 'Menu item created' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Update an existing menu item
 * @param {number} id - Menu item ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - { success, message }
 */
export function updateMenuItem(id, updates) {
  const existing = getMenuItemById(id);
  if (!existing) {
    return { success: false, message: 'Menu item not found' };
  }

  const fields = [];
  const values = [];

  if (updates.item_number !== undefined) { fields.push('item_number = ?'); values.push(updates.item_number); }
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.price_small !== undefined) { fields.push('price_small = ?'); values.push(updates.price_small); }
  if (updates.price_large !== undefined) { fields.push('price_large = ?'); values.push(updates.price_large); }
  if (updates.price_single !== undefined) { fields.push('price_single = ?'); values.push(updates.price_single); }
  if (updates.included !== undefined) { fields.push('included = ?'); values.push(updates.included); }
  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  if (updates.is_spicy !== undefined) { fields.push('is_spicy = ?'); values.push(updates.is_spicy ? 1 : 0); }

  if (fields.length === 0) {
    return { success: false, message: 'No fields to update' };
  }

  values.push(id);
  db.prepare(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return { success: true, message: 'Menu item updated' };
}

/**
 * Delete a menu item
 * @param {number} id - Menu item ID
 * @returns {Object} - { success, message }
 */
export function deleteMenuItem(id) {
  const result = db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  if (result.changes === 0) {
    return { success: false, message: 'Menu item not found' };
  }
  return { success: true, message: 'Menu item deleted' };
}

/**
 * Get all unique categories
 * @returns {Array<string>} - Array of category names
 */
export function getMenuCategories() {
  return db.prepare('SELECT DISTINCT category FROM menu_items ORDER BY category').all()
    .map(row => row.category);
}

// ---------------------------------------------------------------------------
// Analytics Functions (FAREAST-10)
// ---------------------------------------------------------------------------

/**
 * Get order analytics for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} - Analytics data
 */
export function getOrderAnalytics(startDate, endDate) {
  // Daily order counts and revenue
  const dailyStats = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as order_count,
      SUM(total) as revenue,
      AVG(total) as avg_order_value
    FROM orders
    WHERE DATE(created_at) BETWEEN ? AND ?
      AND status != 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(startDate, endDate);

  // Total summary
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      SUM(total) as total_revenue,
      AVG(total) as avg_order_value,
      COUNT(DISTINCT phone_number) as unique_customers
    FROM orders
    WHERE DATE(created_at) BETWEEN ? AND ?
      AND status != 'cancelled'
  `).get(startDate, endDate);

  // Order status breakdown
  const statusBreakdown = db.prepare(`
    SELECT
      status,
      COUNT(*) as count
    FROM orders
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY status
  `).all(startDate, endDate);

  // Hourly distribution (for peak hours analysis)
  const hourlyDistribution = db.prepare(`
    SELECT
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as order_count
    FROM orders
    WHERE DATE(created_at) BETWEEN ? AND ?
      AND status != 'cancelled'
    GROUP BY hour
    ORDER BY hour ASC
  `).all(startDate, endDate);

  return {
    dailyStats,
    summary: {
      totalOrders: summary.total_orders || 0,
      totalRevenue: summary.total_revenue || 0,
      avgOrderValue: summary.avg_order_value || 0,
      uniqueCustomers: summary.unique_customers || 0,
    },
    statusBreakdown,
    hourlyDistribution,
  };
}

/**
 * Get popular menu items analytics
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {number} limit - Number of items to return
 * @returns {Array} - Popular items with counts and revenue
 */
export function getPopularItems(startDate, endDate, limit = 10) {
  return db.prepare(`
    SELECT
      oi.item_name as name,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.total) as total_revenue,
      COUNT(DISTINCT oi.order_id) as order_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) BETWEEN ? AND ?
      AND o.status != 'cancelled'
    GROUP BY oi.item_name
    ORDER BY total_quantity DESC
    LIMIT ?
  `).all(startDate, endDate, limit);
}

/**
 * Get category revenue breakdown
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} - Revenue by category
 */
export function getCategoryRevenue(startDate, endDate) {
  return db.prepare(`
    SELECT
      COALESCE(mi.category, 'Uncategorized') as category,
      SUM(oi.total) as revenue,
      SUM(oi.quantity) as quantity
    FROM order_items oi
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) BETWEEN ? AND ?
      AND o.status != 'cancelled'
    GROUP BY category
    ORDER BY revenue DESC
  `).all(startDate, endDate);
}

/**
 * Get real-time dashboard stats
 * @returns {Object} - Current day stats and comparisons
 */
export function getDashboardStats() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Today's stats
  const todayStats = db.prepare(`
    SELECT
      COUNT(*) as orders,
      COALESCE(SUM(total), 0) as revenue,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
    FROM orders
    WHERE DATE(created_at) = ?
      AND status != 'cancelled'
  `).get(today);

  // Yesterday's stats for comparison
  const yesterdayStats = db.prepare(`
    SELECT
      COUNT(*) as orders,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE DATE(created_at) = ?
      AND status != 'cancelled'
  `).get(yesterday);

  // Calculate percentage changes
  const orderChange = yesterdayStats.orders > 0
    ? ((todayStats.orders - yesterdayStats.orders) / yesterdayStats.orders * 100).toFixed(1)
    : 0;
  const revenueChange = yesterdayStats.revenue > 0
    ? ((todayStats.revenue - yesterdayStats.revenue) / yesterdayStats.revenue * 100).toFixed(1)
    : 0;

  return {
    today: {
      orders: todayStats.orders,
      revenue: todayStats.revenue,
      pendingOrders: todayStats.pending_orders,
    },
    comparison: {
      orderChange: parseFloat(orderChange),
      revenueChange: parseFloat(revenueChange),
    },
  };
}

// ---------------------------------------------------------------------------
// Customer Profile Functions (Sprint 9.2)
// ---------------------------------------------------------------------------

/**
 * Get a customer profile by phone number.
 *
 * @param {string} phoneNumber - Customer phone number (any format)
 * @returns {Object|null} - Customer profile or null if not found
 */
export function getCustomerProfile(phoneNumber) {
  const normalized = phoneNumber.replace(/\D/g, '');
  const row = db.prepare(`
    SELECT phone_number, preferred_language, typical_order_items, last_order_date, order_count, notes
    FROM customer_profiles
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone_number, '-', ''), '(', ''), ')', ''), ' ', '') = ?
  `).get(normalized);

  if (!row) return null;

  return {
    phoneNumber: row.phone_number,
    preferredLanguage: row.preferred_language || 'en',
    typicalOrderItems: row.typical_order_items ? JSON.parse(row.typical_order_items) : [],
    lastOrderDate: row.last_order_date || null,
    orderCount: row.order_count || 0,
    notes: row.notes || '',
  };
}

/**
 * Create or update a customer profile.
 * On conflict (same phone_number), merges provided fields.
 *
 * @param {string} phoneNumber - Customer phone number
 * @param {Object} data - Fields to set/update
 * @param {string} [data.preferredLanguage] - Detected language code
 * @param {Array}  [data.typicalOrderItems] - Items ordered (merged with existing)
 * @param {string} [data.lastOrderDate] - ISO date string of last order
 * @param {number} [data.orderCount] - Total order count (will be incremented if incrementCount=true)
 * @param {string} [data.notes] - Free-form notes
 * @param {boolean} [data.incrementCount] - If true, increment order_count by 1
 */
export function upsertCustomerProfile(phoneNumber, data = {}) {
  const normalized = phoneNumber.replace(/\D/g, '');

  const upsert = db.transaction(() => {
    const existing = db.prepare(`
      SELECT phone_number, preferred_language, typical_order_items, last_order_date, order_count, notes
      FROM customer_profiles
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone_number, '-', ''), '(', ''), ')', ''), ' ', '') = ?
    `).get(normalized);

    if (!existing) {
      // Insert new profile
      const items = data.typicalOrderItems || [];
      db.prepare(`
        INSERT INTO customer_profiles (phone_number, preferred_language, typical_order_items, last_order_date, order_count, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        phoneNumber,
        data.preferredLanguage || 'en',
        JSON.stringify(items),
        data.lastOrderDate || null,
        data.incrementCount ? 1 : (data.orderCount || 0),
        data.notes || ''
      );
    } else {
      // Merge and update existing profile
      const existingItems = existing.typical_order_items ? JSON.parse(existing.typical_order_items) : [];
      const newItems = data.typicalOrderItems || [];

      // Merge item names, keeping most recent additions up front
      const mergedSet = new Set([...newItems, ...existingItems]);
      const mergedItems = [...mergedSet].slice(0, 20); // cap at 20 items

      const newCount = data.incrementCount
        ? (existing.order_count || 0) + 1
        : (data.orderCount !== undefined ? data.orderCount : existing.order_count || 0);

      db.prepare(`
        UPDATE customer_profiles SET
          preferred_language = ?,
          typical_order_items = ?,
          last_order_date = ?,
          order_count = ?,
          notes = ?
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone_number, '-', ''), '(', ''), ')', ''), ' ', '') = ?
      `).run(
        data.preferredLanguage || existing.preferred_language || 'en',
        JSON.stringify(mergedItems),
        data.lastOrderDate || existing.last_order_date || null,
        newCount,
        data.notes !== undefined ? data.notes : (existing.notes || ''),
        normalized
      );
    }
  });

  upsert();
}

// Export the raw db for cases where direct access is needed
// (use sparingly - prefer the atomic functions above)
export { db };
