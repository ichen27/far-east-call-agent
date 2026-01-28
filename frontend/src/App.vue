<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  useWebSocket,
  useOrderApi,
  useNotification,
  useFormatters,
  type WSOrder,
  type ConnectionState,
} from './composables'
import { type Order, type OrderStatus } from './types'

// Configuration - use environment variables in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

// Polling configuration (fallback when WebSocket fails)
const POLL_INTERVAL_MS = 5000
const MAX_RECONNECT_ATTEMPTS = 10

// Composables
const { formatDateTime, formatPhone, formatCurrency, getTodayFormatted } = useFormatters()
const { playNotification } = useNotification()
const {
  error: apiError,
  fetchOrders: apiFetchOrders,
  updateOrderStatus: apiUpdateStatus,
  clearError,
} = useOrderApi({ baseUrl: API_BASE_URL })

const {
  connectionState,
  isConnected,
  lastError: wsError,
  reconnectAttempts,
  connect,
  disconnect,
  onNewOrder,
  onStateChange,
  onError,
} = useWebSocket({
  url: WS_URL,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  jitterFactor: 0.3,
})

// State
const orders = ref<Order[]>([])
const viewMode = ref<'current' | 'history'>('current')
const lastKnownOrderNumbers = ref<Set<string>>(new Set())
const usingPollingFallback = ref(false)
const isInitialLoading = ref(true)
const statusUpdateInProgress = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

// Computed properties
const filteredOrders = computed(() => {
  if (viewMode.value === 'current') {
    return orders.value.filter(order => order.status === 'pending')
  }
  return orders.value.filter(order => order.status === 'completed' || order.status === 'cancelled')
})

const connectionStatusText = computed(() => {
  if (usingPollingFallback.value) {
    return 'Polling'
  }
  switch (connectionState.value) {
    case 'connected':
      return 'Live'
    case 'connecting':
      return 'Connecting...'
    case 'reconnecting':
      return `Reconnecting (${reconnectAttempts.value})...`
    case 'disconnected':
      return 'Disconnected'
    default:
      return 'Unknown'
  }
})

const connectionStatusClass = computed(() => {
  if (usingPollingFallback.value) {
    return 'polling'
  }
  return connectionState.value
})

const todayDate = computed(() => getTodayFormatted())

const hasError = computed(() => {
  return !!(apiError.value || (wsError.value && !isConnected.value && !usingPollingFallback.value))
})

const errorMessage = computed(() => {
  if (apiError.value) {
    return apiError.value.message
  }
  if (wsError.value && !isConnected.value && !usingPollingFallback.value) {
    return `Connection issue: ${wsError.value}`
  }
  return null
})

/**
 * Convert WebSocket order format to component order format
 */
function wsOrderToOrder(wsOrder: WSOrder): Order {
  return {
    orderNumber: wsOrder.orderNumber,
    items: wsOrder.items.map(item => ({ ...item, price: 0 })),
    phoneNumber: wsOrder.phoneNumber,
    timeOrdered: new Date(wsOrder.time),
    totalPrice: wsOrder.total,
    status: wsOrder.status,
  }
}

/**
 * Fetch orders and detect new ones
 */
async function fetchOrders(): Promise<void> {
  const fetchedOrders = await apiFetchOrders()

  if (fetchedOrders.length === 0 && apiError.value) {
    // API error occurred, don't update state
    return
  }

  // Detect new orders for notification
  const currentOrderNumbers = new Set(fetchedOrders.map(o => o.orderNumber))
  const newOrders = fetchedOrders.filter(
    o => !lastKnownOrderNumbers.value.has(o.orderNumber)
  )

  if (newOrders.length > 0 && lastKnownOrderNumbers.value.size > 0) {
    console.log(`[App] ${newOrders.length} new order(s) detected via REST`)
    playNotification()
  }

  orders.value = fetchedOrders
  lastKnownOrderNumbers.value = currentOrderNumbers
}

/**
 * Start polling fallback when WebSocket fails
 */
function startPollingFallback(): void {
  if (pollInterval) return

  usingPollingFallback.value = true
  console.log('[App] Starting polling fallback')
  pollInterval = setInterval(fetchOrders, POLL_INTERVAL_MS)
}

/**
 * Stop polling fallback
 */
function stopPollingFallback(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    usingPollingFallback.value = false
    console.log('[App] Stopped polling fallback')
  }
}

/**
 * Handle new order received via WebSocket
 */
function handleNewOrder(wsOrder: WSOrder): void {
  const order = wsOrderToOrder(wsOrder)
  const existingIndex = orders.value.findIndex(o => o.orderNumber === order.orderNumber)

  if (existingIndex >= 0) {
    orders.value[existingIndex] = order
    console.log(`[App] Updated order: ${order.orderNumber}`)
  } else {
    orders.value.unshift(order)
    lastKnownOrderNumbers.value.add(order.orderNumber)
    console.log(`[App] New order added via WebSocket: ${order.orderNumber}`)
    playNotification()
  }
}

/**
 * Handle connection state changes
 */
function handleStateChange(state: ConnectionState): void {
  console.log(`[App] WebSocket state: ${state}`)

  if (state === 'connected') {
    stopPollingFallback()
    clearError()
  }
}

/**
 * Handle WebSocket errors
 */
function handleError(error: string): void {
  console.error(`[App] WebSocket error: ${error}`)
}

/**
 * Manually retry WebSocket connection
 */
function retryConnection(): void {
  stopPollingFallback()
  clearError()
  connect()
}

/**
 * Update order status with optimistic UI update
 */
async function updateOrderStatus(order: Order, newStatus: OrderStatus): Promise<void> {
  const previousStatus = order.status
  statusUpdateInProgress.value = order.orderNumber

  // Optimistic update
  order.status = newStatus

  const success = await apiUpdateStatus(order.orderNumber, newStatus)

  if (!success) {
    // Revert on failure
    order.status = previousStatus
    console.error(`[App] Failed to update order ${order.orderNumber} status`)
  }

  statusUpdateInProgress.value = null
}

/**
 * Format date for display (wrapper for template)
 */
function formatDate(date: Date): [string, string] {
  return formatDateTime(date)
}

// Lifecycle hooks
onMounted(async () => {
  // Initial load via REST API
  await fetchOrders()
  isInitialLoading.value = false

  // Set up WebSocket event handlers
  onNewOrder(handleNewOrder)
  onStateChange(handleStateChange)
  onError(handleError)

  // Connect to WebSocket for real-time updates
  connect()
})

onUnmounted(() => {
  stopPollingFallback()
  disconnect()
})

// Watch for reconnection attempts to trigger fallback
watch(reconnectAttempts, (attempts) => {
  if (attempts >= MAX_RECONNECT_ATTEMPTS && !usingPollingFallback.value) {
    console.log('[App] Max reconnection attempts reached, switching to polling')
    startPollingFallback()
  }
})
</script>

<template>
  <div class="dashboard-container">
    <!-- Header Section -->
    <header class="header">
      <div class="header-brand">
        <div class="brand-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>
          </svg>
        </div>
        <div class="brand-text">
          <h1>Far East Chinese Restaurant</h1>
          <span class="date">{{ todayDate }}</span>
        </div>
      </div>

      <div class="header-controls">
        <div class="connection-status" :class="connectionStatusClass">
          <span class="status-dot"></span>
          <span class="status-text">{{ connectionStatusText }}</span>
          <button
            v-if="connectionState === 'disconnected' && !usingPollingFallback"
            class="retry-btn"
            @click="retryConnection"
          >
            Retry
          </button>
        </div>

        <div class="view-toggle">
          <button
            :class="{ active: viewMode === 'current' }"
            @click="viewMode = 'current'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Current Orders
            <span v-if="viewMode === 'current' && filteredOrders.length > 0" class="count-badge">{{ filteredOrders.length }}</span>
          </button>
          <button
            :class="{ active: viewMode === 'history' }"
            @click="viewMode = 'history'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v5h5M3 8a9 9 0 1 1 2.83 6.36"/>
            </svg>
            History
          </button>
        </div>
      </div>
    </header>

    <!-- Error Banner -->
    <div v-if="hasError" class="error-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ errorMessage }}</span>
      <button v-if="apiError" class="dismiss-btn" @click="clearError">Dismiss</button>
    </div>

    <!-- Loading State -->
    <div v-if="isInitialLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading orders...</p>
    </div>

    <!-- Orders Section -->
    <main v-else class="orders-section">
      <div class="orders-container">
        <!-- Order Cards -->
        <div
          v-for="order in filteredOrders"
          :key="order.orderNumber"
          class="order-card"
          :class="[`status-${order.status}`, { 'updating': statusUpdateInProgress === order.orderNumber }]"
        >
          <!-- Status Accent Bar -->
          <div class="status-accent"></div>

          <!-- Card Content -->
          <div class="card-content">
            <!-- Order Header -->
            <div class="order-header">
              <div class="order-number">
                <span class="order-hash">#</span>{{ order.orderNumber }}
              </div>
              <div class="order-meta">
                <span class="order-time">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  {{ formatDate(order.timeOrdered)[1] }}
                </span>
                <span class="order-date">{{ formatDate(order.timeOrdered)[0] }}</span>
              </div>
            </div>

            <!-- Items Section -->
            <div class="order-items">
              <div class="section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
                Items ({{ order.items.length }})
              </div>
              <ul class="items-list">
                <li
                  v-for="(item, index) in order.items"
                  :key="index"
                  class="item"
                >
                  <div class="item-main">
                    <span class="quantity-badge">{{ item.quantity }}</span>
                    <span class="item-name">{{ item.name }}</span>
                    <span v-if="item.size" class="item-size">{{ item.size }}</span>
                  </div>
                  <div v-if="item.modifications" class="item-mods">
                    {{ item.modifications }}
                  </div>
                </li>
              </ul>
            </div>

            <!-- Order Footer -->
            <div class="order-footer">
              <div class="footer-info">
                <div class="info-item phone-info">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  <span>{{ formatPhone(order.phoneNumber) }}</span>
                </div>
                <div class="info-item total-info">
                  <span class="total-label">Total</span>
                  <span class="total-value">{{ formatCurrency(order.totalPrice) }}</span>
                </div>
              </div>

              <div class="status-control">
                <select
                  class="status-dropdown"
                  :class="order.status"
                  :value="order.status"
                  :disabled="statusUpdateInProgress === order.orderNumber"
                  @change="updateOrderStatus(order, ($event.target as HTMLSelectElement).value as OrderStatus)"
                >
                  <option value="pending">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredOrders.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg v-if="viewMode === 'current'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 14l2 2 4-4"/>
            </svg>
            <svg v-else width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3v5h5M3 8a9 9 0 1 1 2.83 6.36"/>
              <path d="M12 7v5l3 3"/>
            </svg>
          </div>
          <h3 v-if="viewMode === 'current'">No current orders</h3>
          <h3 v-else>No order history</h3>
          <p v-if="viewMode === 'current'">New orders will appear here automatically</p>
          <p v-else>Completed and cancelled orders will be shown here</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ============================================
   CSS Variables - Design Tokens
   ============================================ */
:root {
  --color-primary: #c41e3a;
  --color-primary-dark: #a01830;
  --color-primary-light: #e8354f;

  --color-pending: #f59e0b;
  --color-pending-bg: #fef3c7;
  --color-pending-border: #fcd34d;
  --color-pending-text: #92400e;

  --color-completed: #10b981;
  --color-completed-bg: #d1fae5;
  --color-completed-border: #6ee7b7;
  --color-completed-text: #065f46;

  --color-cancelled: #ef4444;
  --color-cancelled-bg: #fee2e2;
  --color-cancelled-border: #fca5a5;
  --color-cancelled-text: #991b1b;

  --color-bg-primary: #f8fafc;
  --color-bg-secondary: #ffffff;
  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;

  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;

  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* ============================================
   Base Layout
   ============================================ */
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, #f1f5f9 100%);
  font-family: var(--font-sans);
  color: var(--color-text-primary);
}

/* ============================================
   Header Styles
   ============================================ */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-md);
}

.brand-text h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.brand-text .date {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-top: 2px;
  display: block;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Connection Status */
.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.connection-status.connected {
  background: var(--color-completed-bg);
  color: var(--color-completed-text);
  border: 1px solid var(--color-completed-border);
}

.connection-status.connecting,
.connection-status.reconnecting {
  background: var(--color-pending-bg);
  color: var(--color-pending-text);
  border: 1px solid var(--color-pending-border);
}

.connection-status.disconnected {
  background: var(--color-cancelled-bg);
  color: var(--color-cancelled-text);
  border: 1px solid var(--color-cancelled-border);
}

.connection-status.polling {
  background: #e0e7ff;
  color: #4338ca;
  border: 1px solid #a5b4fc;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.retry-btn {
  margin-left: 8px;
  padding: 4px 12px;
  border: 1px solid currentColor;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: inherit;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

/* View Toggle */
.view-toggle {
  display: flex;
  gap: 4px;
  background: var(--color-bg-primary);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.view-toggle button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  position: relative;
}

.view-toggle button:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

.view-toggle button.active {
  background: var(--color-bg-secondary);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.count-badge {
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}

/* ============================================
   Error Banner
   ============================================ */
.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1400px;
  margin: 16px auto;
  padding: 14px 20px;
  background: var(--color-cancelled-bg);
  border: 1px solid var(--color-cancelled-border);
  border-radius: var(--radius-md);
  color: var(--color-cancelled-text);
  font-size: 14px;
  font-weight: 500;
  animation: slideDown 0.3s ease-out;
}

.error-banner .dismiss-btn {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid currentColor;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: inherit;
  transition: all var(--transition-fast);
}

.error-banner .dismiss-btn:hover {
  background: rgba(153, 27, 27, 0.1);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============================================
   Loading State
   ============================================ */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  max-width: 1400px;
  margin: 24px auto;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-container p {
  margin-top: 16px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* ============================================
   Orders Section
   ============================================ */
.orders-section {
  padding: 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.orders-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

/* ============================================
   Order Card Styles
   ============================================ */
.order-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all var(--transition-normal);
  animation: cardSlideIn 0.4s ease-out;
  position: relative;
}

.order-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.order-card.updating {
  opacity: 0.6;
  pointer-events: none;
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Status Accent Bar */
.status-accent {
  height: 4px;
  width: 100%;
  transition: background var(--transition-fast);
}

.order-card.status-pending .status-accent {
  background: linear-gradient(90deg, var(--color-pending) 0%, #fbbf24 100%);
}

.order-card.status-completed .status-accent {
  background: linear-gradient(90deg, var(--color-completed) 0%, #34d399 100%);
}

.order-card.status-cancelled .status-accent {
  background: linear-gradient(90deg, var(--color-cancelled) 0%, #f87171 100%);
}

.card-content {
  padding: 20px;
}

/* Order Header */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.order-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}

.order-hash {
  color: var(--color-text-muted);
  font-weight: 600;
}

.order-meta {
  text-align: right;
}

.order-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.order-time svg {
  color: var(--color-text-muted);
}

.order-date {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
  display: block;
}

/* Items Section */
.order-items {
  margin-bottom: 16px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  background: var(--color-bg-primary);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  transition: background var(--transition-fast);
}

.item:hover {
  background: var(--color-border-light);
}

.item-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quantity-badge {
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.item-size {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-border-light);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.item-mods {
  margin-top: 6px;
  margin-left: 34px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-style: italic;
  padding-left: 10px;
  border-left: 2px solid var(--color-border);
}

/* Order Footer */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.info-item svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.phone-info span {
  font-weight: 500;
  font-family: var(--font-mono);
}

.total-info {
  gap: 12px;
}

.total-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.total-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-completed);
  font-family: var(--font-mono);
}

/* Status Control */
.status-control {
  flex-shrink: 0;
}

.status-dropdown {
  padding: 10px 36px 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 2px solid transparent;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: all var(--transition-fast);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.status-dropdown:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.status-dropdown:focus {
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.status-dropdown.pending {
  background-color: var(--color-pending-bg);
  color: var(--color-pending-text);
  border-color: var(--color-pending-border);
}

.status-dropdown.completed {
  background-color: var(--color-completed-bg);
  color: var(--color-completed-text);
  border-color: var(--color-completed-border);
}

.status-dropdown.cancelled {
  background-color: var(--color-cancelled-bg);
  color: var(--color-cancelled-text);
  border-color: var(--color-cancelled-border);
}

.status-dropdown:hover:not(:disabled) {
  filter: brightness(0.97);
}

/* ============================================
   Empty State
   ============================================ */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-border);
}

.empty-icon {
  width: 96px;
  height: 96px;
  background: var(--color-bg-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: var(--color-text-muted);
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* ============================================
   Responsive Design
   ============================================ */
@media (max-width: 1200px) {
  .orders-container {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
    gap: 16px;
    padding: 16px 20px;
  }

  .header-brand {
    width: 100%;
  }

  .header-controls {
    width: 100%;
    justify-content: space-between;
  }

  .orders-section {
    padding: 16px;
  }

  .orders-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .header-controls {
    flex-direction: column;
    gap: 12px;
  }

  .view-toggle {
    width: 100%;
  }

  .view-toggle button {
    flex: 1;
    justify-content: center;
  }

  .brand-text h1 {
    font-size: 18px;
  }

  .order-number {
    font-size: 24px;
  }

  .order-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .status-control {
    width: 100%;
  }

  .status-dropdown {
    width: 100%;
    text-align: center;
    padding: 12px 36px 12px 14px;
  }
}

/* ============================================
   Accessibility - Focus States
   ============================================ */
.view-toggle button:focus-visible,
.retry-btn:focus-visible,
.status-dropdown:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ============================================
   Print Styles
   ============================================ */
@media print {
  .header-controls,
  .status-control {
    display: none;
  }

  .order-card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #000;
  }

  .dashboard-container {
    background: white;
  }
}
</style>
