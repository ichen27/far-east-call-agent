<script setup lang="ts">
/**
 * OrderDashboard Component
 *
 * A reusable dashboard component for displaying and managing orders.
 * Uses composables for API calls, WebSocket communication, notifications, and formatting.
 *
 * Note: This component has similar functionality to App.vue but is designed
 * to be used as a standalone component that can be embedded in other views.
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  useWebSocket,
  useOrderApi,
  useNotification,
  useFormatters,
  type WSOrder,
  type ConnectionState,
} from '../composables'
import { type Order, type OrderStatus } from '../types'

// Props with defaults
interface Props {
  apiBaseUrl?: string
  wsUrl?: string
  pollIntervalMs?: number
  maxReconnectAttempts?: number
}

const props = withDefaults(defineProps<Props>(), {
  apiBaseUrl: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080',
  pollIntervalMs: 5000,
  maxReconnectAttempts: 10,
})

// Emits for parent component communication
const emit = defineEmits<{
  (e: 'orderAdded', order: Order): void
  (e: 'orderUpdated', order: Order): void
  (e: 'statusChanged', orderNumber: string, status: OrderStatus): void
  (e: 'error', error: string): void
}>()

// Composables
const { formatDateTime, formatPhone, formatCurrency, getTodayFormatted } = useFormatters()
const { playNotification } = useNotification()
const {
  error: apiError,
  fetchOrders: apiFetchOrders,
  updateOrderStatus: apiUpdateStatus,
  clearError,
} = useOrderApi({ baseUrl: props.apiBaseUrl })

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
  url: props.wsUrl,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  maxReconnectAttempts: props.maxReconnectAttempts,
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
    return 'Polling Mode'
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
    emit('error', apiError.value.message)
    return
  }

  // Detect new orders for notification
  const currentOrderNumbers = new Set(fetchedOrders.map(o => o.orderNumber))
  const newOrders = fetchedOrders.filter(
    o => !lastKnownOrderNumbers.value.has(o.orderNumber)
  )

  if (newOrders.length > 0 && lastKnownOrderNumbers.value.size > 0) {
    console.log(`[OrderDashboard] ${newOrders.length} new order(s) detected via REST`)
    playNotification()
    newOrders.forEach(order => emit('orderAdded', order))
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
  console.log('[OrderDashboard] Starting polling fallback')
  pollInterval = setInterval(fetchOrders, props.pollIntervalMs)
}

/**
 * Stop polling fallback
 */
function stopPollingFallback(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    usingPollingFallback.value = false
    console.log('[OrderDashboard] Stopped polling fallback')
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
    console.log(`[OrderDashboard] Updated order: ${order.orderNumber}`)
    emit('orderUpdated', order)
  } else {
    orders.value.unshift(order)
    lastKnownOrderNumbers.value.add(order.orderNumber)
    console.log(`[OrderDashboard] New order added: ${order.orderNumber}`)
    playNotification()
    emit('orderAdded', order)
  }
}

/**
 * Handle connection state changes
 */
function handleStateChange(state: ConnectionState): void {
  console.log(`[OrderDashboard] Connection state: ${state}`)

  if (state === 'connected') {
    stopPollingFallback()
    clearError()
  } else if (state === 'disconnected' && reconnectAttempts.value >= props.maxReconnectAttempts) {
    startPollingFallback()
  }
}

/**
 * Handle WebSocket errors
 */
function handleError(error: string): void {
  console.error(`[OrderDashboard] WebSocket error: ${error}`)
  emit('error', error)
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

  if (success) {
    emit('statusChanged', order.orderNumber, newStatus)
  } else {
    // Revert on failure
    order.status = previousStatus
    console.error(`[OrderDashboard] Failed to update order ${order.orderNumber} status`)
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
  await fetchOrders()
  isInitialLoading.value = false

  onNewOrder(handleNewOrder)
  onStateChange(handleStateChange)
  onError(handleError)

  connect()
})

onUnmounted(() => {
  stopPollingFallback()
  disconnect()
})

// Watch for reconnection attempts to trigger fallback
watch(reconnectAttempts, (attempts) => {
  if (attempts >= props.maxReconnectAttempts && !usingPollingFallback.value) {
    console.log('[OrderDashboard] Max reconnection attempts reached, switching to polling')
    startPollingFallback()
  }
})

// Expose methods for parent component use
defineExpose({
  fetchOrders,
  retryConnection,
  orders,
  isConnected,
  connectionState,
})
</script>

<template>
  <div class="dashboard-wrapper">
    <div class="header">
      <h1>Far East Chinese Restaurant <span class="date">{{ todayDate }}</span></h1>
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
            Current Orders
            <span v-if="viewMode === 'current' && filteredOrders.length > 0" class="count-badge">
              {{ filteredOrders.length }}
            </span>
          </button>
          <button
            :class="{ active: viewMode === 'history' }"
            @click="viewMode = 'history'"
          >
            History
          </button>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="hasError" class="error-banner">
      {{ errorMessage }}
      <button v-if="apiError" class="dismiss-btn" @click="clearError">Dismiss</button>
    </div>

    <!-- Loading State -->
    <div v-if="isInitialLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading orders...</p>
    </div>

    <div v-else class="orders-container">
      <div
        v-for="order in filteredOrders"
        :key="order.orderNumber"
        class="order-ticket"
        :class="{ 'updating': statusUpdateInProgress === order.orderNumber }"
      >
        <!-- Order Number -->
        <div class="ticket-section order-number">
          <span class="value">#{{ order.orderNumber }}</span>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Items List -->
        <div class="ticket-section items">
          <span class="label">Items</span>
          <ul class="items-list">
            <li
              v-for="(item, index) in order.items"
              :key="index"
              class="item"
            >
              <div class="item-main">
                <span class="quantity">{{ item.quantity }}x</span>
                <span class="item-name">{{ item.name }}</span>
                <span v-if="item.size" class="item-size">({{ item.size }})</span>
              </div>
              <div v-if="item.modifications" class="item-mods">
                - {{ item.modifications }}
              </div>
            </li>
          </ul>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Phone Number -->
        <div class="ticket-section phone">
          <span class="label">Phone</span>
          <span class="value">{{ formatPhone(order.phoneNumber) }}</span>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Time Ordered -->
        <div class="ticket-section time">
          <span class="label">Date/Time</span>
          <span class="value">{{ formatDate(order.timeOrdered)[0] }}</span>
          <span class="value">{{ formatDate(order.timeOrdered)[1] }}</span>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Total Price -->
        <div class="ticket-section total">
          <span class="label">Total</span>
          <span class="value">{{ formatCurrency(order.totalPrice) }}</span>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Status Dropdown -->
        <div class="ticket-section order-status">
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

      <!-- Empty State -->
      <div v-if="filteredOrders.length === 0" class="empty-state">
        <p v-if="viewMode === 'current'">No current orders</p>
        <p v-else>No order history</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-wrapper {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  color: #222;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 .date {
  font-size: 14px;
  font-weight: 400;
  color: #666;
  margin-left: 20px;
  margin-bottom: -7px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  width: 1280px;
  margin: 0 auto 20px auto;
}

.header h1 {
  margin-bottom: 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.connection-status.connected {
  background: #d1fae5;
  color: #065f46;
}

.connection-status.connecting,
.connection-status.reconnecting {
  background: #fef3c7;
  color: #92400e;
}

.connection-status.disconnected {
  background: #fee2e2;
  color: #991b1b;
}

.connection-status.polling {
  background: #e0e7ff;
  color: #3730a3;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.retry-btn {
  margin-left: 8px;
  padding: 4px 12px;
  border: 1px solid currentColor;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  color: inherit;
  transition: background 0.2s ease;
}

.retry-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.view-toggle button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
}

.view-toggle button:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.view-toggle button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.count-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.view-toggle button:not(.active) .count-badge {
  background: #2563eb;
  color: white;
}

.error-banner {
  width: 1280px;
  margin: 0 auto 16px auto;
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dismiss-btn {
  padding: 4px 12px;
  border: 1px solid #991b1b;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  color: #991b1b;
  transition: background 0.2s ease;
}

.dismiss-btn:hover {
  background: rgba(153, 27, 27, 0.1);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  width: 1280px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-container p {
  margin-top: 16px;
  color: #666;
  font-size: 14px;
}

.orders-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  height: 700px;
  width: 1280px;
  margin: 0 auto;
  overflow-y: auto;
  overflow-x: hidden;
}

.orders-container::-webkit-scrollbar {
  width: 8px;
}

.orders-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.orders-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.orders-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.order-ticket {
  display: flex;
  align-items: stretch;
  width: 100%;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 16px 0;
  gap: 0;
  animation: slideIn 0.3s ease-out;
  transition: opacity 0.2s ease;
}

.order-ticket.updating {
  opacity: 0.6;
  pointer-events: none;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ticket-section {
  display: flex;
  flex-direction: column;
  padding: 0 20px;
  justify-content: center;
}

.label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.value {
  font-size: 16px;
  font-weight: 500;
  color: #222;
}

.divider {
  width: 1px;
  background: #e0e0e0;
  align-self: stretch;
}

/* Order Number */
.order-number {
  padding: 30px;
}

.order-number .value {
  font-size: 20px;
  font-weight: 700;
  color: black;
}

/* Items */
.items {
  display: flex;
  align-items: center;
  min-width: 500px;
  gap: 6px;
  padding: 4px 10px;
}

.items-list {
  list-style: disc;
  padding-left: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: flex-start;
  gap: 6px;
}

.item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-main::before {
  content: "\2022";
  color: #666;
  margin-right: 4px;
}

.item-mods {
  margin-left: 24px;
  font-size: 13px;
  color: #888;
  font-style: italic;
}

.quantity {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.item-name {
  font-size: 14px;
  color: #333;
}

.item-size {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

/* Phone */
.phone {
  display: flex;
  align-items: center;
  min-width: 140px;
}

/* Time */
.time {
  display: flex;
  align-items: center;
  min-width: 80px;
}

/* Total */
.total {
  display: flex;
  align-items: center;
  min-width: 100px;
}

.total .value {
  font-size: 18px;
  font-weight: 700;
  color: #16a34a;
}

.order-status {
  display: flex;
  padding: 30px;
  min-width: 120px;
}

.order-status .value {
  font-size: 20px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 6px;
}

.status-dropdown {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
  transition: opacity 0.2s ease;
}

.status-dropdown:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.status-dropdown.pending {
  background-color: #fef3c7;
  color: #92400e;
}

.status-dropdown.completed {
  background-color: #d1fae5;
  color: #065f46;
}

.status-dropdown.cancelled {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-dropdown:hover:not(:disabled) {
  opacity: 0.9;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #888;
  font-size: 16px;
}
</style>
