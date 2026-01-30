<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ============================================================================
// Types
// ============================================================================

type OrderStatus = 'pending' | 'completed' | 'cancelled'

interface OrderItem {
  orderItemId?: number
  menuItemId: string
  menuItemName?: string
  quantity: number
  size: string | null
  modifications: string
}

interface Order {
  orderId?: number
  orderNumber: string
  phoneNumber: string
  status: OrderStatus
  subtotal: number
  tax: number
  total: number
  notes: string
  createdAt?: string
  updatedAt?: string
  items: OrderItem[]
}

interface ApiResponse {
  success: boolean
  orders?: Order[]
  order?: Order
  view?: string
  timestamp?: string
  error?: string
}

// ============================================================================
// Configuration
// ============================================================================

// API base URL - empty string means same origin (Vercel)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const POLL_INTERVAL_MS = 3000

// ============================================================================
// State
// ============================================================================

const orders = ref<Order[]>([])
const viewMode = ref<'current' | 'history'>('current')
const isLoading = ref(true)
const error = ref<string | null>(null)
const statusUpdateInProgress = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

// ============================================================================
// Computed Properties
// ============================================================================

const currentOrderCount = computed(() => {
  return orders.value.filter(o => o.status === 'pending').length
})

const todayDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

// ============================================================================
// Formatters
// ============================================================================

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchOrders(): Promise<void> {
  try {
    // Use view parameter to fetch pending or history orders
    const view = viewMode.value === 'current' ? 'pending' : 'history'
    const response = await fetch(`${API_BASE_URL}/api/orders?view=${view}`)
    const data: ApiResponse = await response.json()

    if (data.success && data.orders) {
      orders.value = data.orders
      error.value = null
    } else {
      throw new Error(data.error || 'Failed to fetch orders')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch orders'
    console.error('[App] Fetch error:', err)
  }
}

async function updateOrderStatus(orderNumber: string, newStatus: OrderStatus): Promise<void> {
  statusUpdateInProgress.value = orderNumber

  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    const data: ApiResponse = await response.json()

    if (data.success && data.order) {
      // If status changed to completed/cancelled, remove from current view
      // If in history view, update the order in place
      if (viewMode.value === 'current' && newStatus !== 'pending') {
        orders.value = orders.value.filter(o => o.orderNumber !== orderNumber)
      } else if (viewMode.value === 'history') {
        const index = orders.value.findIndex(o => o.orderNumber === orderNumber)
        if (index >= 0) {
          orders.value[index] = data.order
        }
      }
    } else {
      throw new Error(data.error || 'Failed to update status')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update status'
    console.error('[App] Status update error:', err)
  } finally {
    statusUpdateInProgress.value = null
  }
}

// ============================================================================
// Audio Notification
// ============================================================================

let audioContext: AudioContext | null = null

function playNotification(): void {
  try {
    if (!audioContext) {
      audioContext = new AudioContext()
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3

    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch {
    // Ignore audio errors
  }
}

// ============================================================================
// Polling Control
// ============================================================================

async function pollOrders(): Promise<void> {
  const previousCount = orders.value.length
  await fetchOrders()

  // Play notification if new orders arrived (only in current view)
  if (viewMode.value === 'current' && orders.value.length > previousCount) {
    playNotification()
  }
}

function startPolling(): void {
  if (pollInterval) return

  pollInterval = setInterval(pollOrders, POLL_INTERVAL_MS)
  console.log('[App] Polling started')
}

function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    console.log('[App] Polling stopped')
  }
}

// ============================================================================
// View Mode Change
// ============================================================================

async function switchView(mode: 'current' | 'history'): Promise<void> {
  viewMode.value = mode
  isLoading.value = true
  await fetchOrders()
  isLoading.value = false
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  await fetchOrders()
  isLoading.value = false
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">🥡</span>
          <h1>Far East Chinese Restaurant</h1>
        </div>
        <span class="date">{{ todayDate }}</span>
      </div>

      <div class="header-right">
        <div class="connection-status polling">
          <span class="status-dot"></span>
          <span>Live</span>
        </div>

        <div class="view-toggle">
          <button
            :class="{ active: viewMode === 'current' }"
            @click="switchView('current')"
          >
            Current Orders
            <span v-if="currentOrderCount > 0" class="count-badge">{{ currentOrderCount }}</span>
          </button>
          <button
            :class="{ active: viewMode === 'history' }"
            @click="switchView('history')"
          >
            History
          </button>
        </div>
      </div>
    </header>

    <!-- Error Banner -->
    <div v-if="error" class="error-banner">
      <span>{{ error }}</span>
      <button @click="error = null" class="dismiss-btn">x</button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading orders...</p>
    </div>

    <!-- Orders Grid -->
    <main v-else class="orders-container">
      <div v-if="orders.length === 0" class="empty-state">
        <span class="empty-icon">{{ viewMode === 'current' ? '📋' : '📜' }}</span>
        <h2>{{ viewMode === 'current' ? 'No pending orders' : 'No order history' }}</h2>
        <p>{{ viewMode === 'current' ? 'New orders will appear here' : 'Completed orders will be shown here' }}</p>
      </div>

      <div v-else class="orders-grid">
        <article
          v-for="order in orders"
          :key="order.orderNumber"
          class="order-card"
          :class="[order.status, { updating: statusUpdateInProgress === order.orderNumber }]"
        >
          <!-- Status Accent -->
          <div class="status-accent"></div>

          <!-- Order Header -->
          <div class="order-header">
            <span class="order-number">#{{ order.orderNumber }}</span>
            <span class="order-time">{{ formatDateTime(order.createdAt) }}</span>
          </div>

          <!-- Order Items -->
          <div class="order-items">
            <h3 class="section-label">Items</h3>
            <ul>
              <li v-for="(item, idx) in order.items" :key="idx" class="item">
                <div class="item-main">
                  <span class="quantity-badge">{{ item.quantity }}x</span>
                  <span class="item-name">{{ item.menuItemName || item.menuItemId }}</span>
                  <span v-if="item.size" class="item-size">({{ item.size }})</span>
                </div>
                <div v-if="item.modifications" class="item-mods">
                  {{ item.modifications }}
                </div>
              </li>
            </ul>
          </div>

          <!-- Order Notes -->
          <div v-if="order.notes" class="order-notes">
            <h3 class="section-label">Notes</h3>
            <p>{{ order.notes }}</p>
          </div>

          <!-- Order Footer -->
          <div class="order-footer">
            <div class="footer-info">
              <div class="phone">
                <span class="label">Tel:</span>
                <span>{{ formatPhone(order.phoneNumber) }}</span>
              </div>
              <div class="price-breakdown">
                <div class="subtotal">Subtotal: {{ formatCurrency(order.subtotal) }}</div>
                <div class="tax">Tax (8%): {{ formatCurrency(order.tax) }}</div>
                <div class="total">Total: {{ formatCurrency(order.total) }}</div>
              </div>
            </div>

            <div class="status-control">
              <select
                :value="order.status"
                @change="updateOrderStatus(order.orderNumber, ($event.target as HTMLSelectElement).value as OrderStatus)"
                :disabled="statusUpdateInProgress === order.orderNumber"
                :class="order.status"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<style>
/* Import Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* CSS Custom Properties */
:root {
  --color-primary: #c41e3a;
  --color-primary-dark: #a01830;
  --color-success: #059669;
  --color-warning: #d97706;
  --color-danger: #dc2626;
  --color-info: #0284c7;

  --color-pending: #f59e0b;
  --color-completed: #059669;
  --color-cancelled: #6b7280;

  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 32px;
}

.logo h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.date {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Connection Status */
.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  background: #ecfdf5;
  color: var(--color-success);
}

.connection-status.polling {
  background: #ecfdf5;
  color: var(--color-success);
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

/* View Toggle */
.view-toggle {
  display: flex;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 4px;
}

.view-toggle button {
  padding: 8px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-toggle button.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.count-badge {
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}

/* Error Banner */
.error-banner {
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-danger);
}

.dismiss-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: inherit;
}

/* Loading */
.loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  color: var(--color-text-secondary);
}

.spinner {
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

/* Orders Container */
.orders-container {
  flex: 1;
  padding: 24px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--color-text);
}

/* Orders Grid */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

/* Order Card */
.order-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.order-card.updating {
  opacity: 0.7;
  pointer-events: none;
}

/* Status Accent Bar */
.status-accent {
  height: 4px;
  background: var(--color-pending);
}

.order-card.completed .status-accent { background: var(--color-completed); }
.order-card.cancelled .status-accent { background: var(--color-cancelled); }

/* Order Header */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.order-number {
  font-size: 24px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.order-time {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* Order Items */
.order-items {
  padding: 16px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.order-items ul {
  list-style: none;
}

.item {
  margin-bottom: 12px;
}

.item:last-child {
  margin-bottom: 0;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-badge {
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  min-width: 32px;
  text-align: center;
}

.item-name {
  font-weight: 500;
}

.item-size {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.item-mods {
  margin-left: 40px;
  padding-left: 12px;
  border-left: 2px solid var(--color-border);
  font-size: 13px;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 4px;
}

/* Order Notes */
.order-notes {
  padding: 0 16px 16px;
}

.order-notes p {
  font-size: 14px;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

/* Order Footer */
.order-footer {
  padding: 16px;
  background: var(--color-bg);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phone {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 14px;
}

.phone .label {
  color: var(--color-text-secondary);
}

.price-breakdown {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.price-breakdown .subtotal,
.price-breakdown .tax {
  margin-bottom: 2px;
}

.price-breakdown .total {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-success);
  margin-top: 4px;
}

/* Status Dropdown */
.status-control select {
  padding: 10px 36px 10px 14px;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.status-control select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.status-control select.pending { border-color: var(--color-pending); color: var(--color-pending); }
.status-control select.completed { border-color: var(--color-completed); color: var(--color-completed); }
.status-control select.cancelled { border-color: var(--color-cancelled); color: var(--color-cancelled); }

/* Responsive */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .logo h1 {
    font-size: 16px;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .view-toggle {
    width: 100%;
  }

  .view-toggle button {
    flex: 1;
    justify-content: center;
  }

  .orders-grid {
    grid-template-columns: 1fr;
  }

  .order-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .status-control {
    width: 100%;
  }

  .status-control select {
    width: 100%;
  }
}
</style>
