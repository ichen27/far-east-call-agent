import { ref, readonly, onUnmounted, type Ref } from 'vue'
import { type OrderStatus } from '../types'

/**
 * WebSocket Connection States
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

/**
 * Order item interface matching backend payload
 */
export interface OrderItem {
  name: string
  quantity: number
  size: string | null
  modifications: string
}

/**
 * Order interface matching backend 'new_order' payload
 */
export interface Order {
  orderNumber: string
  phoneNumber: string
  items: OrderItem[]
  notes: string
  time: string
  date: string
  total: number
  status: OrderStatus
}

/**
 * WebSocket message types from backend
 */
export interface WelcomeMessage {
  type: 'welcome'
  message: string
}

export interface NewOrderMessage {
  type: 'new_order'
  payload: Order
}

export interface PongMessage {
  type: 'pong'
  timestamp: number
}

export interface BroadcastMessage {
  type: 'broadcast'
  payload: unknown
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type WebSocketMessage =
  | WelcomeMessage
  | NewOrderMessage
  | PongMessage
  | BroadcastMessage
  | ErrorMessage

/**
 * Configuration options for useWebSocket
 */
export interface UseWebSocketOptions {
  /** WebSocket server URL (default: ws://localhost:8080) */
  url?: string
  /** Initial reconnection delay in ms (default: 1000) */
  initialReconnectDelay?: number
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Maximum number of reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number
  /** Heartbeat timeout in ms (default: 5000) */
  heartbeatTimeout?: number
  /** Enable automatic connection on composable initialization (default: false) */
  autoConnect?: boolean
  /** Jitter factor for reconnection delay (0-1, default: 0.3) */
  jitterFactor?: number
}

/**
 * Return type for useWebSocket composable
 */
export interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: Readonly<Ref<ConnectionState>>
  /** Whether the WebSocket is connected */
  isConnected: Readonly<Ref<boolean>>
  /** Last error message if any */
  lastError: Readonly<Ref<string | null>>
  /** Number of reconnection attempts made */
  reconnectAttempts: Readonly<Ref<number>>
  /** Connect to WebSocket server */
  connect: () => void
  /** Disconnect from WebSocket server */
  disconnect: () => void
  /** Send a message through WebSocket */
  send: (data: unknown) => boolean
  /** Register a handler for new order events */
  onNewOrder: (handler: (order: Order) => void) => () => void
  /** Register a handler for connection state changes */
  onStateChange: (handler: (state: ConnectionState) => void) => () => void
  /** Register a handler for any message */
  onMessage: (handler: (message: WebSocketMessage) => void) => () => void
  /** Register a handler for errors */
  onError: (handler: (error: string) => void) => () => void
}

/**
 * Vue composable for reliable WebSocket communication with the backend.
 *
 * Features:
 * - Automatic reconnection with exponential backoff and jitter
 * - Heartbeat/ping-pong mechanism to detect stale connections
 * - Connection state tracking
 * - Type-safe message handling
 * - Event-based API for new orders and other messages
 *
 * @example
 * ```typescript
 * const {
 *   isConnected,
 *   connect,
 *   disconnect,
 *   onNewOrder
 * } = useWebSocket({ url: 'ws://localhost:8080' })
 *
 * onMounted(() => {
 *   connect()
 *   onNewOrder((order) => {
 *     console.log('New order received:', order)
 *   })
 * })
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = 'ws://localhost:8080',
    initialReconnectDelay = 1000,
    maxReconnectDelay = 30000,
    backoffMultiplier = 2,
    maxReconnectAttempts = Infinity,
    heartbeatInterval = 30000,
    heartbeatTimeout = 5000,
    autoConnect = false,
    jitterFactor = 0.3,
  } = options

  // Reactive state
  const connectionState = ref<ConnectionState>('disconnected')
  const isConnected = ref(false)
  const lastError = ref<string | null>(null)
  const reconnectAttempts = ref(0)

  // Internal state
  let socket: WebSocket | null = null
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
  let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null
  let heartbeatTimeoutId: ReturnType<typeof setTimeout> | null = null
  let currentReconnectDelay = initialReconnectDelay
  let intentionalDisconnect = false

  // Event handlers
  const newOrderHandlers = new Set<(order: Order) => void>()
  const stateChangeHandlers = new Set<(state: ConnectionState) => void>()
  const messageHandlers = new Set<(message: WebSocketMessage) => void>()
  const errorHandlers = new Set<(error: string) => void>()

  /**
   * Calculate reconnection delay with exponential backoff and jitter
   */
  function calculateReconnectDelay(): number {
    const baseDelay = Math.min(currentReconnectDelay, maxReconnectDelay)
    // Add jitter: delay * (1 + random * jitterFactor)
    const jitter = baseDelay * jitterFactor * Math.random()
    return Math.floor(baseDelay + jitter)
  }

  /**
   * Update connection state and notify handlers
   */
  function updateState(newState: ConnectionState): void {
    connectionState.value = newState
    isConnected.value = newState === 'connected'
    stateChangeHandlers.forEach(handler => handler(newState))
  }

  /**
   * Handle errors and notify handlers
   */
  function handleError(error: string): void {
    lastError.value = error
    errorHandlers.forEach(handler => handler(error))
    console.error('[WebSocket] Error:', error)
  }

  /**
   * Clear all timers
   */
  function clearTimers(): void {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId)
      heartbeatIntervalId = null
    }
    if (heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId)
      heartbeatTimeoutId = null
    }
  }

  /**
   * Start heartbeat mechanism to detect stale connections
   */
  function startHeartbeat(): void {
    stopHeartbeat()

    heartbeatIntervalId = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        // Send ping
        socket.send(JSON.stringify({ type: 'ping' }))

        // Set timeout for pong response
        heartbeatTimeoutId = setTimeout(() => {
          console.warn('[WebSocket] Heartbeat timeout - connection may be stale')
          // Force reconnect if pong not received
          if (socket) {
            socket.close(4000, 'Heartbeat timeout')
          }
        }, heartbeatTimeout)
      }
    }, heartbeatInterval)
  }

  /**
   * Stop heartbeat mechanism
   */
  function stopHeartbeat(): void {
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId)
      heartbeatIntervalId = null
    }
    if (heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId)
      heartbeatTimeoutId = null
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  function handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      // Clear heartbeat timeout on any message (connection is alive)
      if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId)
        heartbeatTimeoutId = null
      }

      // Notify all message handlers
      messageHandlers.forEach(handler => handler(message))

      // Handle specific message types
      switch (message.type) {
        case 'welcome':
          console.log('[WebSocket] Connected:', message.message)
          break

        case 'new_order':
          console.log('[WebSocket] New order received:', message.payload.orderNumber)
          newOrderHandlers.forEach(handler => handler(message.payload))
          break

        case 'pong':
          // Heartbeat response received - connection is healthy
          break

        case 'error':
          handleError(message.message)
          break

        case 'broadcast':
          // Generic broadcast - handlers can process via onMessage
          break

        default:
          console.log('[WebSocket] Unknown message type:', message)
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error)
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  function scheduleReconnect(): void {
    if (intentionalDisconnect) {
      return
    }

    if (reconnectAttempts.value >= maxReconnectAttempts) {
      handleError(`Max reconnection attempts (${maxReconnectAttempts}) reached`)
      updateState('disconnected')
      return
    }

    updateState('reconnecting')
    const delay = calculateReconnectDelay()

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value + 1})`)

    reconnectTimeoutId = setTimeout(() => {
      reconnectAttempts.value++
      currentReconnectDelay = Math.min(
        currentReconnectDelay * backoffMultiplier,
        maxReconnectDelay
      )
      connect()
    }, delay)
  }

  /**
   * Connect to the WebSocket server
   */
  function connect(): void {
    // Clean up existing connection
    if (socket) {
      socket.onopen = null
      socket.onclose = null
      socket.onerror = null
      socket.onmessage = null
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
      socket = null
    }

    clearTimers()
    intentionalDisconnect = false
    updateState('connecting')
    lastError.value = null

    try {
      socket = new WebSocket(url)

      socket.onopen = (): void => {
        console.log('[WebSocket] Connected to', url)
        updateState('connected')
        // Reset reconnection state on successful connection
        reconnectAttempts.value = 0
        currentReconnectDelay = initialReconnectDelay
        // Start heartbeat
        startHeartbeat()
      }

      socket.onclose = (event: CloseEvent): void => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason)
        stopHeartbeat()

        if (!intentionalDisconnect) {
          // Unintentional disconnect - try to reconnect
          scheduleReconnect()
        } else {
          updateState('disconnected')
        }
      }

      socket.onerror = (): void => {
        // Note: WebSocket error events don't provide much detail
        // The close event will follow with more information
        handleError('WebSocket connection error')
      }

      socket.onmessage = handleMessage
    } catch (error) {
      handleError(`Failed to create WebSocket: ${error}`)
      scheduleReconnect()
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  function disconnect(): void {
    intentionalDisconnect = true
    clearTimers()

    if (socket) {
      socket.onopen = null
      socket.onclose = null
      socket.onerror = null
      socket.onmessage = null

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Client disconnect')
      }
      socket = null
    }

    updateState('disconnected')
    reconnectAttempts.value = 0
    currentReconnectDelay = initialReconnectDelay
    console.log('[WebSocket] Disconnected intentionally')
  }

  /**
   * Send a message through the WebSocket
   * @returns true if message was sent, false otherwise
   */
  function send(data: unknown): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message - not connected')
      return false
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      socket.send(message)
      return true
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error)
      return false
    }
  }

  /**
   * Register a handler for new order events
   * @returns Unsubscribe function
   */
  function onNewOrder(handler: (order: Order) => void): () => void {
    newOrderHandlers.add(handler)
    return () => newOrderHandlers.delete(handler)
  }

  /**
   * Register a handler for connection state changes
   * @returns Unsubscribe function
   */
  function onStateChange(handler: (state: ConnectionState) => void): () => void {
    stateChangeHandlers.add(handler)
    // Immediately call with current state
    handler(connectionState.value)
    return () => stateChangeHandlers.delete(handler)
  }

  /**
   * Register a handler for any WebSocket message
   * @returns Unsubscribe function
   */
  function onMessage(handler: (message: WebSocketMessage) => void): () => void {
    messageHandlers.add(handler)
    return () => messageHandlers.delete(handler)
  }

  /**
   * Register a handler for errors
   * @returns Unsubscribe function
   */
  function onError(handler: (error: string) => void): () => void {
    errorHandlers.add(handler)
    return () => errorHandlers.delete(handler)
  }

  // Auto-connect if enabled
  if (autoConnect) {
    connect()
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    disconnect()
    // Clear all handlers
    newOrderHandlers.clear()
    stateChangeHandlers.clear()
    messageHandlers.clear()
    errorHandlers.clear()
  })

  return {
    connectionState: readonly(connectionState),
    isConnected: readonly(isConnected),
    lastError: readonly(lastError),
    reconnectAttempts: readonly(reconnectAttempts),
    connect,
    disconnect,
    send,
    onNewOrder,
    onStateChange,
    onMessage,
    onError,
  }
}

export default useWebSocket
