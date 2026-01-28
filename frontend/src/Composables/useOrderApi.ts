import { ref, readonly, type Ref } from 'vue'
import { type ApiOrder, type Order, type OrderStatus, apiOrderToOrder } from '../types'

/**
 * API error with additional context
 */
export interface ApiError {
  message: string
  status?: number
  isNetworkError: boolean
}

/**
 * Configuration options for useOrderApi
 */
export interface UseOrderApiOptions {
  /** Base URL for the API (default: http://localhost:8080) */
  baseUrl?: string
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial retry delay in ms (default: 1000) */
  retryDelay?: number
  /** Retry backoff multiplier (default: 2) */
  retryBackoff?: number
}

/**
 * Return type for useOrderApi composable
 */
export interface UseOrderApiReturn {
  /** Whether an API request is in progress */
  isLoading: Readonly<Ref<boolean>>
  /** Last error that occurred */
  error: Readonly<Ref<ApiError | null>>
  /** Fetch all orders */
  fetchOrders: () => Promise<Order[]>
  /** Update order status */
  updateOrderStatus: (orderNumber: string, status: OrderStatus) => Promise<boolean>
  /** Clear the current error */
  clearError: () => void
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Vue composable for order API operations with retry logic and error handling
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Proper error handling with user-friendly messages
 * - Loading state tracking
 * - Type-safe API responses
 *
 * @example
 * ```typescript
 * const { isLoading, error, fetchOrders, updateOrderStatus } = useOrderApi()
 *
 * const orders = await fetchOrders()
 * await updateOrderStatus('123', 'completed')
 * ```
 */
export function useOrderApi(options: UseOrderApiOptions = {}): UseOrderApiReturn {
  const {
    baseUrl = 'http://localhost:8080',
    maxRetries = 3,
    retryDelay = 1000,
    retryBackoff = 2,
  } = options

  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Create a user-friendly error from a fetch error
   */
  function createApiError(err: unknown, status?: number): ApiError {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return {
        message: 'Unable to connect to server. Please check your connection.',
        isNetworkError: true,
      }
    }

    if (status) {
      const messages: Record<number, string> = {
        400: 'Invalid request. Please try again.',
        401: 'Authentication required.',
        403: 'You do not have permission to perform this action.',
        404: 'The requested resource was not found.',
        500: 'Server error. Please try again later.',
        502: 'Server is temporarily unavailable.',
        503: 'Service is temporarily unavailable.',
      }
      return {
        message: messages[status] || `Request failed with status ${status}`,
        status,
        isNetworkError: false,
      }
    }

    return {
      message: err instanceof Error ? err.message : 'An unexpected error occurred',
      isNetworkError: false,
    }
  }

  /**
   * Execute a fetch request with retry logic
   */
  async function fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        // Don't retry client errors (4xx) except for 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw createApiError(null, response.status)
        }

        // Retry server errors
        if (retryCount < maxRetries) {
          const delay = retryDelay * Math.pow(retryBackoff, retryCount)
          console.log(`[API] Retrying request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
          await sleep(delay)
          return fetchWithRetry<T>(url, options, retryCount + 1)
        }

        throw createApiError(null, response.status)
      }

      return await response.json() as T
    } catch (err) {
      // If it's already an ApiError, rethrow it
      if ((err as ApiError).isNetworkError !== undefined) {
        throw err
      }

      // Network errors should be retried
      if (err instanceof TypeError && retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(retryBackoff, retryCount)
        console.log(`[API] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        await sleep(delay)
        return fetchWithRetry<T>(url, options, retryCount + 1)
      }

      throw createApiError(err)
    }
  }

  /**
   * Fetch all orders from the API
   */
  async function fetchOrders(): Promise<Order[]> {
    isLoading.value = true
    error.value = null

    try {
      const apiOrders = await fetchWithRetry<ApiOrder[]>(`${baseUrl}/api/orders`)
      return apiOrders.map(apiOrderToOrder)
    } catch (err) {
      error.value = err as ApiError
      console.error('[API] Failed to fetch orders:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update an order's status
   */
  async function updateOrderStatus(orderNumber: string, status: OrderStatus): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await fetchWithRetry<void>(
        `${baseUrl}/api/orders/${orderNumber}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      return true
    } catch (err) {
      error.value = err as ApiError
      console.error('[API] Failed to update order status:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear the current error
   */
  function clearError(): void {
    error.value = null
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchOrders,
    updateOrderStatus,
    clearError,
  }
}

export default useOrderApi
