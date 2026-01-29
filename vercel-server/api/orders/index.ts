/**
 * API Route: /api/orders
 *
 * GET  - Fetch all orders (with optional ?since= parameter for polling)
 * POST - Create a new order (called by AWS agent backend)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createOrder, getAllOrders, getOrdersSince, type NewOrder } from '../../lib/db';

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
      // GET /api/orders - Fetch all orders
      // Optional: ?since=ISO_TIMESTAMP to get only new orders (for efficient polling)
      const { since } = req.query;

      let orders;
      if (since && typeof since === 'string') {
        orders = await getOrdersSince(since);
      } else {
        orders = await getAllOrders();
      }

      return res.status(200).json({
        success: true,
        orders,
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

      if (typeof body.total !== 'number' || body.total < 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid total price',
        });
      }

      // Validate each item
      for (const item of body.items) {
        if (!item.name || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
          return res.status(400).json({
            success: false,
            error: 'Invalid item: each item must have name, quantity, and price',
          });
        }
      }

      const order = await createOrder(body);

      console.log(`[API] New order created: #${order.orderNumber}`);

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
