/**
 * API Route: /api/orders
 *
 * GET  - Fetch orders
 *        ?view=pending  -> Current orders (pending only)
 *        ?view=history  -> History (completed, cancelled)
 *        (no param)     -> All orders
 * POST - Create a new order (called by AWS agent backend)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createOrder,
  getAllOrders,
  getPendingOrders,
  getHistoryOrders,
  completeOldOrders,
  getDailyStats,
  type NewOrder,
} from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for agent backend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Auto-complete old orders on each request (lightweight operation)
      await completeOldOrders();

      const { view } = req.query;

      let orders;
      if (view === 'pending') {
        // Current orders - pending only
        orders = await getPendingOrders();
      } else if (view === 'history') {
        // History - completed and cancelled
        orders = await getHistoryOrders();
      } else {
        // All orders
        orders = await getAllOrders();
      }

      // Fetch daily stats
      const stats = await getDailyStats();

      return res.status(200).json({
        success: true,
        orders,
        stats,
        view: view || 'all',
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method === 'POST') {
      // POST /api/orders - Create a new order
      // Called by AWS agent backend when order is submitted
      const body = req.body as NewOrder;

      // Validate required fields
      if (!body.phoneNumber || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: phoneNumber and items[]',
        });
      }

      if (typeof body.subtotal !== 'number' || body.subtotal < 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subtotal price',
        });
      }

      // Validate each item
      for (const item of body.items) {
        if (!item.menuItemId || typeof item.quantity !== 'number') {
          return res.status(400).json({
            success: false,
            error: 'Invalid item: each item must have menuItemId and quantity',
          });
        }
      }

      const order = await createOrder(body);

      console.log(`[API] New order created: #${order.orderNumber} - Total: $${order.total}`);

      return res.status(201).json({
        success: true,
        order,
        message: `Order ${order.orderNumber} created successfully`,
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
