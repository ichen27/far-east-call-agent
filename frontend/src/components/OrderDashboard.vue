<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWebSocket, type Order as WSOrder, type ConnectionState } from '../Composables/useWebSocket'

interface OrderItem {
  name: string
  quantity: number
  size: string | null
  modifications: string
  price?: number
}

interface Order {
  orderNumber: string
  items: OrderItem[]
  phoneNumber: string
  timeOrdered: Date
  totalPrice: number
  status: string
}

// Configure your backend URL
const API_BASE_URL = 'http://localhost:8080'
const WS_URL = 'ws://localhost:8080'

// Polling configuration (fallback)
const POLL_INTERVAL_MS = 5000 // 5 seconds when using fallback polling

// State
const orders = ref<Order[]>([])
const viewMode = ref<'current' | 'history'>('current')
const lastKnownOrderNumbers = ref<Set<string>>(new Set())
const usingPollingFallback = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null

// WebSocket composable
const {
  connectionState,
  isConnected,
  lastError,
  reconnectAttempts,
  connect,
  disconnect,
  onNewOrder,
  onStateChange,
  onError
} = useWebSocket({
  url: WS_URL,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  maxReconnectAttempts: 10, // After 10 attempts, fall back to polling
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
})

// Computed property to filter orders based on view mode
const filteredOrders = computed(() => {
  if (viewMode.value === 'current') {
    return orders.value.filter(order => order.status === 'pending')
  } else {
    return orders.value.filter(order => order.status === 'completed' || order.status === 'cancelled')
  }
})

// Connection status display text
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

// Connection status class for styling
const connectionStatusClass = computed(() => {
  if (usingPollingFallback.value) {
    return 'polling'
  }
  return connectionState.value
})

/**
 * Convert WebSocket order format to component order format
 */
function wsOrderToOrder(wsOrder: WSOrder): Order {
  return {
    orderNumber: wsOrder.orderNumber,
    items: wsOrder.items,
    phoneNumber: wsOrder.phoneNumber,
    timeOrdered: new Date(wsOrder.time),
    totalPrice: wsOrder.total,
    status: wsOrder.status
  }
}

/**
 * Fetch all orders via REST API (initial load + polling fallback)
 */
async function fetchOrders(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`)
    if (!response.ok) throw new Error('Failed to fetch orders')

    const fetchedOrders = await response.json()

    // Map the response to match Order interface
    const mappedOrders: Order[] = fetchedOrders.map((order: any) => ({
      orderNumber: order.orderNumber,
      items: order.items,
      phoneNumber: order.phoneNumber,
      timeOrdered: new Date(order.time),
      totalPrice: order.total,
      status: order.status
    }))

    // Detect new orders (for notification/sound if you want)
    const currentOrderNumbers = new Set(mappedOrders.map(o => o.orderNumber))
    const newOrders = mappedOrders.filter(
      o => !lastKnownOrderNumbers.value.has(o.orderNumber)
    )

    if (newOrders.length > 0 && lastKnownOrderNumbers.value.size > 0) {
      console.log(`[OrderDashboard] ${newOrders.length} new order(s) detected via REST`)
    }

    // Update the orders list
    orders.value = mappedOrders
    lastKnownOrderNumbers.value = currentOrderNumbers

  } catch (error) {
    console.error('[OrderDashboard] Failed to fetch orders:', error)
  }
}

/**
 * Start polling fallback (when WebSocket fails)
 */
function startPollingFallback(): void {
  if (pollInterval) return // Already polling

  usingPollingFallback.value = true
  console.log('[OrderDashboard] Starting polling fallback')

  // Poll every N seconds
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
    console.log('[OrderDashboard] Stopped polling fallback')
  }
}

/**
 * Handle new order received via WebSocket
 */
function handleNewOrder(wsOrder: WSOrder): void {
  const order = wsOrderToOrder(wsOrder)

  // Check if order already exists (update it) or add new
  const existingIndex = orders.value.findIndex(o => o.orderNumber === order.orderNumber)

  if (existingIndex >= 0) {
    // Update existing order
    orders.value[existingIndex] = order
    console.log(`[OrderDashboard] Updated order: ${order.orderNumber}`)
  } else {
    // Add new order at the beginning
    orders.value.unshift(order)
    lastKnownOrderNumbers.value.add(order.orderNumber)
    console.log(`[OrderDashboard] New order added: ${order.orderNumber}`)

    // Optional: Play notification sound or show toast
    playOrderNotification()
  }
}

/**
 * Handle connection state changes
 */
function handleStateChange(state: ConnectionState): void {
  console.log(`[OrderDashboard] Connection state: ${state}`)

  if (state === 'connected') {
    // WebSocket connected - stop polling if active
    stopPollingFallback()
  } else if (state === 'disconnected' && reconnectAttempts.value >= 10) {
    // Max reconnection attempts reached - fall back to polling
    startPollingFallback()
  }
}

/**
 * Handle WebSocket errors
 */
function handleError(error: string): void {
  console.error(`[OrderDashboard] WebSocket error: ${error}`)
}

/**
 * Play a notification sound for new orders
 */
function playOrderNotification(): void {
  try {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (e) {
    // Audio not supported or blocked
    console.log('[OrderDashboard] Could not play notification sound')
  }
}

/**
 * Update order status via REST API
 */
async function updateOrderStatus(order: Order, newStatus: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${order.orderNumber}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })

    if (response.ok) {
      order.status = newStatus
      console.log(`[OrderDashboard] Updated order ${order.orderNumber} status to ${newStatus}`)
    }
  } catch (error) {
    console.error('[OrderDashboard] Failed to update order status:', error)
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): [string, string] {
  const d = new Date(date)
  const dateStr = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return [dateStr, timeStr]
}

/**
 * Get today's date formatted
 */
const todayDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
})

/**
 * Format phone number for display
 */
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Manually retry WebSocket connection
 */
function retryConnection(): void {
  stopPollingFallback()
  connect()
}

// Lifecycle hooks
onMounted(async () => {
  // Initial load via REST API
  await fetchOrders()

  // Set up WebSocket event handlers
  onNewOrder(handleNewOrder)
  onStateChange(handleStateChange)
  onError(handleError)

  // Connect to WebSocket
  connect()
})

onUnmounted(() => {
  stopPollingFallback()
  disconnect()
})

// Watch for reconnection attempts to trigger fallback
watch(reconnectAttempts, (attempts) => {
  if (attempts >= 10 && !usingPollingFallback.value) {
    console.log('[OrderDashboard] Max reconnection attempts reached, switching to polling')
    startPollingFallback()
  }
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
    <div v-if="lastError && !isConnected && !usingPollingFallback" class="error-banner">
      Connection issue: {{ lastError }}
    </div>

    <div class="orders-container">
      <div
        v-for="order in filteredOrders"
        :key="order.orderNumber"
        class="order-ticket"
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
            @change="updateOrderStatus(order, ($event.target as HTMLSelectElement).value)"
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
}

.retry-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.view-toggle button {
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

.error-banner {
  width: 1280px;
  margin: 0 auto 16px auto;
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
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

.status-dropdown:hover {
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
