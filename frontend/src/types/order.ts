/**
 * Order-related type definitions
 * Centralized types for consistency across the application
 */

/**
 * Order status values
 */
export type OrderStatus = 'pending' | 'completed' | 'cancelled'

/**
 * Order item as received from the API
 */
export interface OrderItem {
  name: string
  quantity: number
  size: string | null
  modifications: string
  price?: number
}

/**
 * Order as received from the REST API
 */
export interface ApiOrder {
  orderNumber: string
  phoneNumber: string
  items: OrderItem[]
  notes?: string
  time: string
  date?: string
  total: number
  status: OrderStatus
}

/**
 * Order as used in the application (with parsed date)
 */
export interface Order {
  orderNumber: string
  items: OrderItem[]
  phoneNumber: string
  timeOrdered: Date
  totalPrice: number
  status: OrderStatus
}

/**
 * Request payload for updating order status
 */
export interface UpdateOrderStatusRequest {
  status: OrderStatus
}

/**
 * Convert API order format to application order format
 */
export function apiOrderToOrder(apiOrder: ApiOrder): Order {
  return {
    orderNumber: apiOrder.orderNumber,
    items: apiOrder.items,
    phoneNumber: apiOrder.phoneNumber,
    timeOrdered: new Date(apiOrder.time),
    totalPrice: apiOrder.total,
    status: apiOrder.status,
  }
}
