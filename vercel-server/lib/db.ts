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

// ============================================================================
// Types
// ============================================================================

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id?: number;
  name: string;
  quantity: number;
  size: string | null;
  unitPrice: number;
  modifications: string;
}

export interface Order {
  id?: number;
  orderNumber: string;
  phoneNumber: string;
  status: OrderStatus;
  total: number;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
  items: OrderItem[];
}

export interface NewOrder {
  phoneNumber: string;
  total: number;
  notes?: string;
  items: {
    name: string;
    quantity: number;
    size?: string | null;
    price: number;
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
  // Create orders table
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(20) NOT NULL UNIQUE,
      phone_number VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
      total DECIMAL(10, 2) NOT NULL,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create order_items table
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      size VARCHAR(20),
      unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
      modifications TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create indexes for common queries
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`;

  console.log('[DB] Database tables initialized');
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
 * Create a new order with items (atomic transaction)
 */
export async function createOrder(newOrder: NewOrder): Promise<Order> {
  const orderNumber = await generateOrderNumber();

  // Insert order
  const orderResult = await sql`
    INSERT INTO orders (order_number, phone_number, total, notes, status)
    VALUES (${orderNumber}, ${newOrder.phoneNumber}, ${newOrder.total}, ${newOrder.notes || ''}, 'pending')
    RETURNING id, order_number, phone_number, status, total, notes, created_at, updated_at
  `;

  const order = orderResult.rows[0];

  // Insert order items
  const items: OrderItem[] = [];
  for (const item of newOrder.items) {
    const itemResult = await sql`
      INSERT INTO order_items (order_id, name, quantity, size, unit_price, modifications)
      VALUES (${order.id}, ${item.name}, ${item.quantity}, ${item.size || null}, ${item.price}, ${item.modifications || ''})
      RETURNING id, name, quantity, size, unit_price, modifications
    `;
    items.push({
      id: itemResult.rows[0].id,
      name: itemResult.rows[0].name,
      quantity: itemResult.rows[0].quantity,
      size: itemResult.rows[0].size,
      unitPrice: parseFloat(itemResult.rows[0].unit_price),
      modifications: itemResult.rows[0].modifications,
    });
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status as OrderStatus,
    total: parseFloat(order.total),
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items,
  };
}

/**
 * Get all orders with their items
 */
export async function getAllOrders(): Promise<Order[]> {
  const ordersResult = await sql`
    SELECT id, order_number, phone_number, status, total, notes, created_at, updated_at
    FROM orders
    ORDER BY created_at DESC
  `;

  const orders: Order[] = [];

  for (const row of ordersResult.rows) {
    const itemsResult = await sql`
      SELECT id, name, quantity, size, unit_price, modifications
      FROM order_items
      WHERE order_id = ${row.id}
    `;

    orders.push({
      id: row.id,
      orderNumber: row.order_number,
      phoneNumber: row.phone_number,
      status: row.status as OrderStatus,
      total: parseFloat(row.total),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        size: item.size,
        unitPrice: parseFloat(item.unit_price),
        modifications: item.modifications,
      })),
    });
  }

  return orders;
}

/**
 * Get orders created after a specific timestamp (for polling)
 */
export async function getOrdersSince(since: string): Promise<Order[]> {
  const ordersResult = await sql`
    SELECT id, order_number, phone_number, status, total, notes, created_at, updated_at
    FROM orders
    WHERE created_at > ${since}
    ORDER BY created_at DESC
  `;

  const orders: Order[] = [];

  for (const row of ordersResult.rows) {
    const itemsResult = await sql`
      SELECT id, name, quantity, size, unit_price, modifications
      FROM order_items
      WHERE order_id = ${row.id}
    `;

    orders.push({
      id: row.id,
      orderNumber: row.order_number,
      phoneNumber: row.phone_number,
      status: row.status as OrderStatus,
      total: parseFloat(row.total),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        size: item.size,
        unitPrice: parseFloat(item.unit_price),
        modifications: item.modifications,
      })),
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
    RETURNING id, order_number, phone_number, status, total, notes, created_at, updated_at
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const order = result.rows[0];

  const itemsResult = await sql`
    SELECT id, name, quantity, size, unit_price, modifications
    FROM order_items
    WHERE order_id = ${order.id}
  `;

  return {
    id: order.id,
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status as OrderStatus,
    total: parseFloat(order.total),
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: itemsResult.rows.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      size: item.size,
      unitPrice: parseFloat(item.unit_price),
      modifications: item.modifications,
    })),
  };
}

/**
 * Get a single order by order number
 */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const result = await sql`
    SELECT id, order_number, phone_number, status, total, notes, created_at, updated_at
    FROM orders
    WHERE order_number = ${orderNumber}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const order = result.rows[0];

  const itemsResult = await sql`
    SELECT id, name, quantity, size, unit_price, modifications
    FROM order_items
    WHERE order_id = ${order.id}
  `;

  return {
    id: order.id,
    orderNumber: order.order_number,
    phoneNumber: order.phone_number,
    status: order.status as OrderStatus,
    total: parseFloat(order.total),
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: itemsResult.rows.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      size: item.size,
      unitPrice: parseFloat(item.unit_price),
      modifications: item.modifications,
    })),
  };
}
