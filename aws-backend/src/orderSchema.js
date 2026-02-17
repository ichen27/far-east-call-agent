/**
 * @fileoverview Shared Zod schemas for order validation.
 *
 * This module defines the validation schemas used by both the voice and chat
 * agents for order submission. Centralizing these schemas ensures consistent
 * validation across all order channels.
 *
 * @module orderSchema
 */

import { z } from 'zod';

/**
 * Schema for a single order item.
 * Validates menu item details including name, quantity, size, and modifications.
 * @constant {z.ZodObject}
 */
export const orderItemSchema = z.object({
  /** Name of the menu item (must match menu exactly) */
  name: z.string().describe('Name of the menu item'),

  /** Quantity ordered (positive integer) */
  quantity: z.number().int().positive().describe('How many of this item'),

  /** Size option if applicable - use "N/A" if not applicable */
  size: z
    .string()
    .describe('Size: "Pt" (pint), "Qt" (quart), "Combination", or "N/A" if not applicable'),

  /** Price for this line item */
  price: z.number().nonnegative().describe('Price for this line item'),

  /** Special instructions or modifications - use empty string if none */
  modifications: z
    .string()
    .describe('Any special instructions or modifications, or empty string if none'),
});

/**
 * Schema for the complete order submission.
 * Validates all required fields for processing an order.
 * @constant {z.ZodObject}
 */
export const submitOrderSchema = z.object({
  /** Customer phone number (7-10 digits with optional formatting) */
  phoneNumber: z.string().describe('Customer phone number for the order'),

  /** Array of ordered items */
  items: z.array(orderItemSchema).min(1).describe('Array of items in the order'),

  /** Additional order notes - use empty string if none */
  notes: z.string().describe('Any special instructions for the entire order, or empty string if none'),

  /** Total price including tax */
  totalPrice: z.number().nonnegative().describe('Total price of the order including tax'),

  /** Scheduled pickup time (FAREAST-33) - ISO string or empty for ASAP */
  scheduledPickupTime: z
    .string()
    .optional()
    .describe('Scheduled pickup time as ISO string (e.g., "2024-01-15T18:30:00"), or omit/empty for ASAP pickup'),
});

/**
 * Type definition for an order item.
 * @typedef {z.infer<typeof orderItemSchema>} OrderItem
 */

/**
 * Type definition for a complete order submission.
 * @typedef {z.infer<typeof submitOrderSchema>} SubmitOrderInput
 */

export default {
  orderItemSchema,
  submitOrderSchema,
};
