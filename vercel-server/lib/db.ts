/**
 * Database utilities for Vercel Postgres
 *
 * This module provides typed database operations for the order management system.
 * Uses Vercel's @vercel/postgres for serverless-compatible connections.
 */

import { createPool } from '@vercel/postgres';

// Create pool with custom env var name (Neon uses FAR_EAST_ prefix)
const pool = createPool({
  connectionString: process.env.FAR_EAST_POSTGRES_URL || process.env.POSTGRES_URL,
});

// Helper to run SQL queries
const sql = pool.sql.bind(pool);

// NY State tax rate
const TAX_RATE = 0.08;

// ============================================================================
// Types
// ============================================================================

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface MenuItem {
  menuItemId: string;
  name: string;
  combinationPrice: number | null;
  pintPrice: number | null;
  quartPrice: number | null;
  category: string;
}

export interface OrderItem {
  orderItemId?: number;
  menuItemId: string;
  menuItemName?: string; // Joined from menu_item table
  quantity: number;
  size: string | null;
  modifications: string;
}

export interface Order {
  orderId?: number;
  orderNumber: string;
  phoneNumber: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
  items: OrderItem[];
}

export interface NewOrder {
  phoneNumber: string;
  subtotal: number;
  notes?: string;
  items: {
    menuItemId: string;
    quantity: number;
    size?: string | null;
    modifications?: string;
  }[];
}

// ============================================================================
// Database Schema Initialization
// ============================================================================

/**
 * Initialize database tables if they don't exist
 * Call this on first deployment or when schema needs updating
 */
export async function initializeDatabase(): Promise<void> {
  // Create menu_item table
  await sql`
    CREATE TABLE IF NOT EXISTS menu_item (
      menu_item_id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      combination_price DECIMAL(10, 2),
      pint_price DECIMAL(10, 2),
      quart_price DECIMAL(10, 2),
      category VARCHAR(100) NOT NULL
    )
  `;

  // Create orders table (renamed from order to orders to avoid SQL reserved word)
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      order_id SERIAL PRIMARY KEY,
      order_number VARCHAR(20) NOT NULL UNIQUE,
      phone_number VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
      subtotal DECIMAL(10, 2) NOT NULL,
      tax DECIMAL(10, 2) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create order_item table
  await sql`
    CREATE TABLE IF NOT EXISTS order_item (
      order_item_id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      menu_item_id VARCHAR(10) NOT NULL REFERENCES menu_item(menu_item_id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      size VARCHAR(20),
      modifications TEXT DEFAULT ''
    )
  `;

  // Create indexes for common queries
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON order_item(order_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_menu_item_category ON menu_item(category)`;

  console.log('[DB] Database tables initialized');
}

/**
 * Drop old tables and recreate with new schema
 * WARNING: This will delete all existing data!
 */
export async function resetDatabase(): Promise<void> {
  console.log('[DB] Starting database reset...');

  // Drop all tables aggressively - in reverse dependency order
  try {
    await sql`DROP TABLE IF EXISTS order_item CASCADE`;
    console.log('[DB] Dropped order_item');
  } catch (e) { console.log('[DB] order_item drop skipped:', e); }

  try {
    await sql`DROP TABLE IF EXISTS order_items CASCADE`;
    console.log('[DB] Dropped order_items (old)');
  } catch (e) { console.log('[DB] order_items drop skipped:', e); }

  try {
    await sql`DROP TABLE IF EXISTS orders CASCADE`;
    console.log('[DB] Dropped orders');
  } catch (e) { console.log('[DB] orders drop skipped:', e); }

  try {
    await sql`DROP TABLE IF EXISTS menu_item CASCADE`;
    console.log('[DB] Dropped menu_item');
  } catch (e) { console.log('[DB] menu_item drop skipped:', e); }

  // Recreate tables
  await initializeDatabase();
  console.log('[DB] Database reset complete');
}

// ============================================================================
// Menu Item Operations
// ============================================================================

/**
 * Insert or update a menu item
 */
export async function upsertMenuItem(item: MenuItem): Promise<void> {
  await sql`
    INSERT INTO menu_item (menu_item_id, name, combination_price, pint_price, quart_price, category)
    VALUES (${item.menuItemId}, ${item.name}, ${item.combinationPrice}, ${item.pintPrice}, ${item.quartPrice}, ${item.category})
    ON CONFLICT (menu_item_id) DO UPDATE SET
      name = EXCLUDED.name,
      combination_price = EXCLUDED.combination_price,
      pint_price = EXCLUDED.pint_price,
      quart_price = EXCLUDED.quart_price,
      category = EXCLUDED.category
  `;
}

/**
 * Bulk insert menu items
 */
export async function bulkInsertMenuItems(items: MenuItem[]): Promise<number> {
  let inserted = 0;
  for (const item of items) {
    await upsertMenuItem(item);
    inserted++;
  }
  return inserted;
}

/**
 * Get all menu items
 */
export async function getAllMenuItems(): Promise<MenuItem[]> {
  const result = await sql`
    SELECT menu_item_id, name, combination_price, pint_price, quart_price, category
    FROM menu_item
    ORDER BY category, menu_item_id
  `;

  return result.rows.map(row => ({
    menuItemId: row.menu_item_id,
    name: row.name,
    combinationPrice: row.combination_price ? parseFloat(row.combination_price) : null,
    pintPrice: row.pint_price ? parseFloat(row.pint_price) : null,
    quartPrice: row.quart_price ? parseFloat(row.quart_price) : null,
    category: row.category,
  }));
}

/**
 * Get menu item by ID
 */
export async function getMenuItemById(menuItemId: string): Promise<MenuItem | null> {
  const result = await sql`
    SELECT menu_item_id, name, combination_price, pint_price, quart_price, category
    FROM menu_item
    WHERE menu_item_id = ${menuItemId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    menuItemId: row.menu_item_id,
    name: row.name,
    combinationPrice: row.combination_price ? parseFloat(row.combination_price) : null,
    pintPrice: row.pint_price ? parseFloat(row.pint_price) : null,
    quartPrice: row.quart_price ? parseFloat(row.quart_price) : null,
    category: row.category,
  };
}

// ============================================================================
// Order Operations
// ============================================================================

/**
 * Generate a unique order number for today
 * Format: Simple daily counter (1, 2, 3, ...)
 */
async function generateOrderNumber(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const result = await sql`
    SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next_number
    FROM orders
    WHERE DATE(created_at) = ${today}
  `;

  return String(result.rows[0]?.next_number || 1);
}

/**
 * Calculate tax (8% NY State)
 */
function calculateTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}

/**
 * Create a new order with items
 */
export async function createOrder(newOrder: NewOrder): Promise<Order> {
  const orderNumber = await generateOrderNumber();
  const tax = calculateTax(newOrder.subtotal);
  const total = Math.round((newOrder.subtotal + tax) * 100) / 100;

  // Insert order
  const orderResult = await sql`
    INSERT INTO orders (order_number, phone_number, subtotal, tax, total, notes, status)
    VALUES (${orderNumber}, ${newOrder.phoneNumber}, ${newOrder.subtotal}, ${tax}, ${total}, ${newOrder.notes || ''}, 'pending')
    RETURNING order_id, order_number, phone_number, status, subtotal, tax, total, notes, created_at, updated_at
  `;

  const order = orderResult.rows[0];

  // Insert order items
  const items: OrderItem[] = [];
  for (const item of newOrder.items) {
    const itemResult = await sql`
      INSERT INTO order_item (order_id, menu_item_id, quantity, size, modifications)
      VALUES (${order.order_id}, ${item.menuItemId}, ${item.quantity}, ${item.size || null}, ${item.modifications || ''})
      RETURNING order_item_id, menu_item_id, quantity, size, modifications
    `;

    // Get menu item name
    const menuItem = await getMenuItemById(item.menuItemId);

    items.push({
      orderItemId: itemResult.rows[0].order_item_id,
      menuItemId: itemResult.rows[0].menu_item_id,
      menuItemName: menuItem?.name || 'Unknown Item',
      quantity: itemResult.rows[0].quantity,
      size: itemResult.rows[0].size,
      modifications: itemResult.rows[0].modifications,
    });
  }

  return {
    orderId: order.order_id,
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status as OrderStatus,
    subtotal: parseFloat(order.subtotal),
    tax: parseFloat(order.tax),
    total: parseFloat(order.total),
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items,
  };
}

/**
 * Get order items with menu item names joined
 */
async function getOrderItemsWithNames(orderId: number): Promise<OrderItem[]> {
  const itemsResult = await sql`
    SELECT oi.order_item_id, oi.menu_item_id, oi.quantity, oi.size, oi.modifications, mi.name as menu_item_name
    FROM order_item oi
    JOIN menu_item mi ON oi.menu_item_id = mi.menu_item_id
    WHERE oi.order_id = ${orderId}
  `;

  return itemsResult.rows.map(item => ({
    orderItemId: item.order_item_id,
    menuItemId: item.menu_item_id,
    menuItemName: item.menu_item_name,
    quantity: item.quantity,
    size: item.size,
    modifications: item.modifications,
  }));
}

/**
 * Get all orders with their items (for history - all statuses)
 */
export async function getAllOrders(): Promise<Order[]> {
  const ordersResult = await sql`
    SELECT order_id, order_number, phone_number, status, subtotal, tax, total, notes, created_at, updated_at
    FROM orders
    ORDER BY created_at DESC
  `;

  const orders: Order[] = [];

  for (const row of ordersResult.rows) {
    const items = await getOrderItemsWithNames(row.order_id);

    orders.push({
      orderId: row.order_id,
      orderNumber: row.order_number,
      phoneNumber: row.phone_number,
      status: row.status as OrderStatus,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
    });
  }

  return orders;
}

/**
 * Get pending orders only (for current orders view)
 */
export async function getPendingOrders(): Promise<Order[]> {
  const ordersResult = await sql`
    SELECT order_id, order_number, phone_number, status, subtotal, tax, total, notes, created_at, updated_at
    FROM orders
    WHERE status = 'pending'
    ORDER BY created_at ASC
  `;

  const orders: Order[] = [];

  for (const row of ordersResult.rows) {
    const items = await getOrderItemsWithNames(row.order_id);

    orders.push({
      orderId: row.order_id,
      orderNumber: row.order_number,
      phoneNumber: row.phone_number,
      status: row.status as OrderStatus,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
    });
  }

  return orders;
}

/**
 * Get completed and cancelled orders (for history view)
 */
export async function getHistoryOrders(): Promise<Order[]> {
  const ordersResult = await sql`
    SELECT order_id, order_number, phone_number, status, subtotal, tax, total, notes, created_at, updated_at
    FROM orders
    WHERE status IN ('completed', 'cancelled')
    ORDER BY updated_at DESC
  `;

  const orders: Order[] = [];

  for (const row of ordersResult.rows) {
    const items = await getOrderItemsWithNames(row.order_id);

    orders.push({
      orderId: row.order_id,
      orderNumber: row.order_number,
      phoneNumber: row.phone_number,
      status: row.status as OrderStatus,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
    });
  }

  return orders;
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderNumber: string, status: OrderStatus): Promise<Order | null> {
  const result = await sql`
    UPDATE orders
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE order_number = ${orderNumber}
    RETURNING order_id, order_number, phone_number, status, subtotal, tax, total, notes, created_at, updated_at
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const order = result.rows[0];
  const items = await getOrderItemsWithNames(order.order_id);

  return {
    orderId: order.order_id,
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status as OrderStatus,
    subtotal: parseFloat(order.subtotal),
    tax: parseFloat(order.tax),
    total: parseFloat(order.total),
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items,
  };
}

/**
 * Get a single order by order number
 */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const result = await sql`
    SELECT order_id, order_number, phone_number, status, subtotal, tax, total, notes, created_at, updated_at
    FROM orders
    WHERE order_number = ${orderNumber}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const order = result.rows[0];
  const items = await getOrderItemsWithNames(order.order_id);

  return {
    orderId: order.order_id,
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status as OrderStatus,
    subtotal: parseFloat(order.subtotal),
    tax: parseFloat(order.tax),
    total: parseFloat(order.total),
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items,
  };
}

/**
 * Auto-complete all orders from previous days
 * Called daily or on app startup to close out old orders
 */
export async function completeOldOrders(): Promise<number> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const result = await sql`
    UPDATE orders
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'pending'
    AND DATE(created_at) < ${today}
    RETURNING order_id
  `;

  console.log(`[DB] Auto-completed ${result.rows.length} orders from previous days`);
  return result.rows.length;
}

/**
 * Get daily stats: pending count, completed today, revenue today
 */
export async function getDailyStats(): Promise<{ pending: number; completedToday: number; revenueToday: number }> {
  const today = new Date().toISOString().split('T')[0];

  const result = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(updated_at) = ${today}) AS completed_today,
      COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND DATE(updated_at) = ${today}), 0) AS revenue_today
    FROM orders
  `;

  const row = result.rows[0];
  return {
    pending: parseInt(row.pending) || 0,
    completedToday: parseInt(row.completed_today) || 0,
    revenueToday: parseFloat(row.revenue_today) || 0,
  };
}
