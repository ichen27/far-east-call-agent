/**
 * API Route: /api/init
 *
 * POST - Initialize database tables (run once on first deployment)
 *
 * This endpoint should be called once after setting up Vercel Postgres
 * to create the necessary tables and indexes.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to initialize.',
    });
  }

  // Optional: Add a secret key check for security
  const { secret } = req.body as { secret?: string };
  const expectedSecret = process.env.INIT_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing secret',
    });
  }

  try {
    await initializeDatabase();

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('[API] Database initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
