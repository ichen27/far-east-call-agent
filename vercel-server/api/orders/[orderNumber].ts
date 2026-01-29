/**
 * API Route: /api/orders/[orderNumber]
 *
 * GET - Fetch a specific order by order number
 * PUT - Update order status
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOrderByNumber, updateOrderStatus, type OrderStatus } from '../../lib/db';

const VALID_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { orderNumber } = req.query;

  if (!orderNumber || typeof orderNumber !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Order number is required',
    });
  }

  try {
    if (req.method === 'GET') {
      // GET /api/orders/[orderNumber] - Fetch specific order
      const order = await getOrderByNumber(orderNumber);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: `Order ${orderNumber} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        order,
      });
    }

    if (req.method === 'PUT') {
      // PUT /api/orders/[orderNumber] - Update order status
      const { status } = req.body as { status: OrderStatus };

      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const order = await updateOrderStatus(orderNumber, status);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: `Order ${orderNumber} not found`,
        });
      }

      console.log(`[API] Order #${orderNumber} status updated to: ${status}`);

      return res.status(200).json({
        success: true,
        order,
        message: `Order ${orderNumber} status updated to ${status}`,
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
