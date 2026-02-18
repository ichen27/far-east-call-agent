<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

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

interface DailyStats {
  pending: number
  completedToday: number
  revenueToday: number
}

interface ApiResponse {
  success: boolean
  orders?: Order[]
  order?: Order
  stats?: DailyStats
  view?: string
  timestamp?: string
  error?: string
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const POLL_INTERVAL_MS = 3000
const TIMER_INTERVAL_MS = 1000

// Urgency thresholds (minutes)
const URGENCY = { green: 5, yellow: 10, orange: 15 }

// ============================================================================
// State
// ============================================================================

const orders = ref<Order[]>([])
const viewMode = ref<'current' | 'history'>('current')
const isLoading = ref(true)
const error = ref<string | null>(null)
const statusUpdateInProgress = ref<string | null>(null)
const now = ref(Date.now())
const stats = ref<DailyStats>({ pending: 0, completedToday: 0, revenueToday: 0 })

// Preferences (localStorage persisted)
const darkMode = ref(localStorage.getItem('fe-dark-mode') !== 'false') // default dark
const soundEnabled = ref(localStorage.getItem('fe-sound') !== 'false') // default on
const prepCollapsed = ref(localStorage.getItem('fe-prep-collapsed') === 'true')

let pollInterval: ReturnType<typeof setInterval> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null

// ============================================================================
// Watchers — persist preferences
// ============================================================================

watch(darkMode, (v) => {
  localStorage.setItem('fe-dark-mode', String(v))
  document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light')
})
watch(soundEnabled, (v) => localStorage.setItem('fe-sound', String(v)))
watch(prepCollapsed, (v) => localStorage.setItem('fe-prep-collapsed', String(v)))

// ============================================================================
// Computed Properties
// ============================================================================

const currentOrderCount = computed(() => orders.value.filter(o => o.status === 'pending').length)

const todayDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
})

// Prep aggregation: combine all items across pending orders
const prepSummary = computed(() => {
  const map = new Map<string, number>()
  for (const order of orders.value) {
    if (order.status !== 'pending') continue
    for (const item of order.items) {
      const name = item.menuItemName || item.menuItemId
      map.set(name, (map.get(name) || 0) + item.quantity)
    }
  }
  return Array.from(map.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
})

// ============================================================================
// Formatters & Helpers
// ============================================================================

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return phone
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function getElapsedMs(dateString?: string): number {
  if (!dateString) return 0
  return now.value - new Date(dateString).getTime()
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 0) return '0s'
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function getUrgencyClass(dateString?: string): string {
  const mins = getElapsedMs(dateString) / 60000
  if (mins >= URGENCY.orange) return 'urgency-critical'
  if (mins >= URGENCY.yellow) return 'urgency-orange'
  if (mins >= URGENCY.green) return 'urgency-yellow'
  return 'urgency-green'
}

function getUrgencyColor(dateString?: string): string {
  const mins = getElapsedMs(dateString) / 60000
  if (mins >= URGENCY.orange) return '#ef4444'
  if (mins >= URGENCY.yellow) return '#f97316'
  if (mins >= URGENCY.green) return '#f59e0b'
  return '#10b981'
}

function getPrepTime(order: Order): string {
  if (!order.createdAt || !order.updatedAt) return ''
  if (order.status !== 'completed') return ''
  const ms = new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchOrders(): Promise<void> {
  try {
    const view = viewMode.value === 'current' ? 'pending' : 'history'
    const response = await fetch(`${API_BASE_URL}/api/orders?view=${view}`)
    const data: ApiResponse = await response.json()

    if (data.success && data.orders) {
      orders.value = data.orders
      if (data.stats) stats.value = data.stats
      error.value = null
    } else {
      throw new Error(data.error || 'Failed to fetch orders')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch orders'
  }
}

async function completeOrder(orderNumber: string): Promise<void> {
  statusUpdateInProgress.value = orderNumber
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    const data: ApiResponse = await response.json()
    if (data.success) {
      const completed = orders.value.find(o => o.orderNumber === orderNumber)
      orders.value = orders.value.filter(o => o.orderNumber !== orderNumber)
      // Optimistically update stats so header stays in sync
      if (completed) {
        stats.value = {
          pending: Math.max(0, stats.value.pending - 1),
          completedToday: stats.value.completedToday + 1,
          revenueToday: stats.value.revenueToday + completed.total,
        }
      }
    } else {
      throw new Error(data.error || 'Failed to complete order')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to complete order'
  } finally {
    statusUpdateInProgress.value = null
  }
}

async function cancelOrder(orderNumber: string): Promise<void> {
  if (!window.confirm(`Cancel order #${orderNumber}?`)) return
  statusUpdateInProgress.value = orderNumber
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const data: ApiResponse = await response.json()
    if (data.success) {
      orders.value = orders.value.filter(o => o.orderNumber !== orderNumber)
      // Optimistically update pending count
      stats.value = { ...stats.value, pending: Math.max(0, stats.value.pending - 1) }
    } else {
      throw new Error(data.error || 'Failed to cancel order')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to cancel order'
  } finally {
    statusUpdateInProgress.value = null
  }
}

// ============================================================================
// Audio Notification — 3-tone kitchen bell
// ============================================================================

let audioContext: AudioContext | null = null

function playNotification(): void {
  if (!soundEnabled.value) return
  try {
    if (!audioContext) audioContext = new AudioContext()
    const ctx = audioContext
    const t = ctx.currentTime

    function tone(freq: number, start: number, dur: number, vol: number) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'triangle'
      gain.gain.setValueAtTime(vol, t + start)
      gain.gain.exponentialRampToValueAtTime(0.01, t + start + dur)
      osc.start(t + start)
      osc.stop(t + start + dur)
    }

    // Three ascending tones — attention-grabbing kitchen bell pattern
    tone(880, 0, 0.15, 0.5)
    tone(1100, 0.18, 0.15, 0.5)
    tone(1320, 0.5, 0.25, 0.6)
  } catch {
    // Ignore audio errors
  }
}

// ============================================================================
// Print Ticket
// ============================================================================

function printOrder(order: Order): void {
  const items = order.items.map(i => {
    let line = `${i.quantity}x  ${i.menuItemName || i.menuItemId}`
    if (i.size) line += ` (${i.size})`
    if (i.modifications) line += `\n     → ${i.modifications}`
    return line
  }).join('\n')

  const ticket = `
<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; margin: 0 auto; }
  .center { text-align: center; }
  .big { font-size: 28px; font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .item { margin: 4px 0; white-space: pre-wrap; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .total-line { font-size: 16px; font-weight: bold; }
</style>
</head>
<body>
  <div class="center">
    <div style="font-size:16px;font-weight:bold;">FAR EAST</div>
    <div style="font-size:11px;">Chinese Restaurant</div>
  </div>
  <div class="sep"></div>
  <div class="center big">#${order.orderNumber}</div>
  <div class="center" style="font-size:11px;">${formatDateTime(order.createdAt)}</div>
  <div class="sep"></div>
  <pre class="item">${items}</pre>
  ${order.notes ? `<div class="sep"></div><div><b>Notes:</b> ${order.notes}</div>` : ''}
  <div class="sep"></div>
  <div class="right">Subtotal: ${formatCurrency(order.subtotal)}</div>
  <div class="right">Tax: ${formatCurrency(order.tax)}</div>
  <div class="right total-line">TOTAL: ${formatCurrency(order.total)}</div>
  <div class="sep"></div>
  <div>Tel: ${formatPhone(order.phoneNumber)}</div>
  <div class="sep"></div>
  <div class="center" style="font-size:10px;">Thank you!</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=320,height=600')
  if (win) {
    win.document.write(ticket)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }
}

// ============================================================================
// Polling & Timer
// ============================================================================

async function pollOrders(): Promise<void> {
  const previousIds = new Set(orders.value.map(o => o.orderNumber))
  await fetchOrders()

  if (viewMode.value === 'current') {
    const hasNew = orders.value.some(o => !previousIds.has(o.orderNumber))
    if (hasNew) playNotification()
  }
}

function startPolling(): void {
  if (pollInterval) return
  pollInterval = setInterval(pollOrders, POLL_INTERVAL_MS)
}

function stopPolling(): void {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}

function startTimer(): void {
  if (timerInterval) return
  timerInterval = setInterval(() => { now.value = Date.now() }, TIMER_INTERVAL_MS)
}

function stopTimer(): void {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

// ============================================================================
// View Mode
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
  document.documentElement.setAttribute('data-theme', darkMode.value ? 'dark' : 'light')
  await fetchOrders()
  isLoading.value = false
  startPolling()
  startTimer()
})

onUnmounted(() => {
  stopPolling()
  stopTimer()
})
</script>

<template>
  <div class="app" :class="{ dark: darkMode }">
    <!-- ================================================================ -->
    <!-- Header                                                           -->
    <!-- ================================================================ -->
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">🥡</span>
          <div class="logo-text">
            <h1>Far East Kitchen</h1>
            <span class="date">{{ todayDate }}</span>
          </div>
        </div>
      </div>

      <div class="header-stats">
        <div class="stat">
          <span class="stat-value stat-pending">{{ stats.pending }}</span>
          <span class="stat-label">Pending</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value stat-done">{{ stats.completedToday }}</span>
          <span class="stat-label">Done Today</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value stat-revenue">{{ formatCurrency(stats.revenueToday) }}</span>
          <span class="stat-label">Revenue</span>
        </div>
      </div>

      <div class="header-right">
        <div class="header-controls">
          <button class="icon-btn" @click="soundEnabled = !soundEnabled" :title="soundEnabled ? 'Mute' : 'Unmute'">
            <span v-if="soundEnabled">🔔</span>
            <span v-else class="muted">🔕</span>
          </button>
          <button class="icon-btn" @click="darkMode = !darkMode" :title="darkMode ? 'Light mode' : 'Dark mode'">
            <span v-if="darkMode">☀️</span>
            <span v-else>🌙</span>
          </button>
        </div>

        <div class="connection-status">
          <span class="status-dot"></span>
          <span>Live</span>
        </div>

        <div class="view-toggle">
          <button :class="{ active: viewMode === 'current' }" @click="switchView('current')">
            🔥 Active
            <span v-if="stats.pending > 0" class="count-badge">{{ stats.pending }}</span>
          </button>
          <button :class="{ active: viewMode === 'history' }" @click="switchView('history')">
            📜 History
          </button>
        </div>
      </div>
    </header>

    <!-- ================================================================ -->
    <!-- Error Banner                                                     -->
    <!-- ================================================================ -->
    <div v-if="error" class="error-banner">
      <span>⚠️ {{ error }}</span>
      <button @click="error = null" class="dismiss-btn">✕</button>
    </div>

    <!-- ================================================================ -->
    <!-- Prep Aggregation Banner                                          -->
    <!-- ================================================================ -->
    <div v-if="viewMode === 'current' && prepSummary.length > 0" class="prep-banner">
      <button class="prep-toggle" @click="prepCollapsed = !prepCollapsed">
        <span class="prep-icon">👨‍🍳</span>
        <span class="prep-title">Prep Queue</span>
        <span class="prep-count">{{ prepSummary.length }} items</span>
        <span class="prep-arrow" :class="{ collapsed: prepCollapsed }">▼</span>
      </button>
      <div v-if="!prepCollapsed" class="prep-items">
        <span v-for="item in prepSummary" :key="item.name" class="prep-chip">
          <strong>{{ item.qty }}×</strong> {{ item.name }}
        </span>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- Loading                                                          -->
    <!-- ================================================================ -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading orders...</p>
    </div>

    <!-- ================================================================ -->
    <!-- Orders Grid                                                      -->
    <!-- ================================================================ -->
    <main v-else class="orders-container">
      <div v-if="orders.length === 0" class="empty-state">
        <span class="empty-icon">{{ viewMode === 'current' ? '✨' : '📜' }}</span>
        <h2>{{ viewMode === 'current' ? 'All clear!' : 'No order history' }}</h2>
        <p>{{ viewMode === 'current' ? 'New orders will appear automatically' : 'Completed orders appear here' }}</p>
      </div>

      <div v-else class="orders-grid">
        <article
          v-for="order in orders"
          :key="order.orderNumber"
          class="order-card"
          :class="[
            order.status,
            { updating: statusUpdateInProgress === order.orderNumber },
            viewMode === 'current' ? getUrgencyClass(order.createdAt) : ''
          ]"
          :style="viewMode === 'current' && order.status === 'pending'
            ? { borderLeftColor: getUrgencyColor(order.createdAt) }
            : {}"
        >
          <!-- Order Header -->
          <div class="order-header">
            <div class="order-header-left">
              <span class="order-number">#{{ order.orderNumber }}</span>
              <!-- Live timer for pending orders -->
              <span
                v-if="order.status === 'pending'"
                class="order-timer"
                :class="getUrgencyClass(order.createdAt)"
              >
                ⏱ {{ formatElapsed(getElapsedMs(order.createdAt)) }}
              </span>
              <!-- Prep time for completed orders -->
              <span v-else-if="getPrepTime(order)" class="prep-time-badge">
                ✅ {{ getPrepTime(order) }}
              </span>
            </div>
            <div class="order-header-right">
              <span class="order-time">{{ formatDateTime(order.createdAt) }}</span>
              <button
                class="print-btn"
                @click="printOrder(order)"
                title="Print ticket"
              >🖨️</button>
            </div>
          </div>

          <!-- Order Items -->
          <div class="order-items">
            <ul>
              <li v-for="(item, idx) in order.items" :key="idx" class="item">
                <div class="item-main">
                  <span class="quantity-badge">{{ item.quantity }}×</span>
                  <span class="item-name">{{ item.menuItemName || item.menuItemId }}</span>
                  <span v-if="item.size" class="item-size">{{ item.size }}</span>
                </div>
                <div v-if="item.modifications" class="item-mods">
                  {{ item.modifications }}
                </div>
              </li>
            </ul>
          </div>

          <!-- Order Notes -->
          <div v-if="order.notes" class="order-notes">
            <p>📝 {{ order.notes }}</p>
          </div>

          <!-- Order Footer -->
          <div class="order-footer">
            <div class="footer-info">
              <span class="phone">📞 {{ formatPhone(order.phoneNumber) }}</span>
              <span class="total-amount">{{ formatCurrency(order.total) }}</span>
            </div>

            <!-- Action Buttons (current view) -->
            <div v-if="viewMode === 'current' && order.status === 'pending'" class="action-buttons">
              <button
                class="action-btn complete-btn"
                :disabled="statusUpdateInProgress === order.orderNumber"
                @click="completeOrder(order.orderNumber)"
              >
                ✅ Complete
              </button>
              <button
                class="action-btn cancel-btn"
                :disabled="statusUpdateInProgress === order.orderNumber"
                @click="cancelOrder(order.orderNumber)"
              >
                ✕ Cancel
              </button>
            </div>

            <!-- Status Badge (history view) -->
            <span v-else class="status-badge" :class="order.status">
              {{ order.status === 'completed' ? '✅ Completed' : '❌ Cancelled' }}
            </span>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ===================================================================== */
/* CSS Custom Properties — Light Theme                                    */
/* ===================================================================== */
:root,
[data-theme="light"] {
  --color-primary: #c41e3a;
  --color-primary-dark: #a01830;
  --color-success: #059669;
  --color-warning: #d97706;
  --color-danger: #dc2626;

  --color-pending: #f59e0b;
  --color-completed: #059669;
  --color-cancelled: #6b7280;

  --color-bg: #f1f5f9;
  --color-surface: #ffffff;
  --color-surface-alt: #f8fafc;
  --color-border: #e2e8f0;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}

/* ===================================================================== */
/* Dark Theme                                                             */
/* ===================================================================== */
[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-alt: #1a2332;
  --color-border: #334155;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
}

/* ===================================================================== */
/* Reset & Base                                                           */
/* ===================================================================== */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===================================================================== */
/* Header                                                                 */
/* ===================================================================== */
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left { display: flex; align-items: center; }

.logo { display: flex; align-items: center; gap: 12px; }
.logo-icon { font-size: 30px; }
.logo-text { display: flex; flex-direction: column; }
.logo-text h1 { font-size: 18px; font-weight: 800; color: var(--color-primary); line-height: 1.2; }
.date { font-size: 12px; color: var(--color-text-muted); }

/* Stats */
.header-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  padding: 6px 16px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.stat { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.stat-value { font-size: 18px; font-weight: 700; }
.stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); }
.stat-pending { color: var(--color-pending); }
.stat-done { color: var(--color-completed); }
.stat-revenue { color: var(--color-primary); font-size: 16px; }
.stat-divider { width: 1px; height: 28px; background: var(--color-border); }

/* Header Right */
.header-right { display: flex; align-items: center; gap: 12px; }

.header-controls { display: flex; gap: 4px; }

.icon-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s;
}
.icon-btn:hover { background: var(--color-surface-alt); }
.muted { opacity: 0.5; }

/* Connection Status */
.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  background: #065f4620;
  color: var(--color-success);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* View Toggle */
.view-toggle {
  display: flex;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 3px;
  border: 1px solid var(--color-border);
}

.view-toggle button {
  padding: 8px 14px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: calc(var(--radius-md) - 2px);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.view-toggle button.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.count-badge {
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

/* ===================================================================== */
/* Error Banner                                                           */
/* ===================================================================== */
.error-banner {
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  padding: 10px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-danger);
  font-size: 14px;
}
[data-theme="dark"] .error-banner { background: #451a1a; border-color: #7f1d1d; }

.dismiss-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
  padding: 4px;
}

/* ===================================================================== */
/* Prep Aggregation Banner                                                */
/* ===================================================================== */
.prep-banner {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0;
}

.prep-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.prep-icon { font-size: 20px; }
.prep-title { flex: 1; text-align: left; }
.prep-count { font-size: 12px; color: var(--color-text-muted); font-weight: 500; }
.prep-arrow { transition: transform 0.2s; font-size: 10px; color: var(--color-text-muted); }
.prep-arrow.collapsed { transform: rotate(-90deg); }

.prep-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 24px 14px;
}

.prep-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  font-size: 13px;
  color: var(--color-text);
}
.prep-chip strong { color: var(--color-primary); }

/* ===================================================================== */
/* Loading                                                                */
/* ===================================================================== */
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
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ===================================================================== */
/* Orders Container                                                       */
/* ===================================================================== */
.orders-container { flex: 1; padding: 20px; }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 24px;
  color: var(--color-text-secondary);
}
.empty-icon { font-size: 56px; display: block; margin-bottom: 12px; }
.empty-state h2 { font-size: 22px; margin-bottom: 6px; color: var(--color-text); }
.empty-state p { font-size: 14px; }

/* Orders Grid */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}

/* ===================================================================== */
/* Order Card                                                             */
/* ===================================================================== */
.order-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
  border-left: 5px solid transparent;
}

.order-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.order-card.updating { opacity: 0.6; pointer-events: none; }

/* Urgency pulse for critical orders */
.order-card.urgency-critical {
  animation: urgency-pulse 2s ease-in-out infinite;
}

@keyframes urgency-pulse {
  0%, 100% { box-shadow: var(--shadow-md); }
  50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25), var(--shadow-lg); }
}

/* History view: completed/cancelled styling */
.order-card.completed { border-left-color: var(--color-completed); }
.order-card.cancelled { border-left-color: var(--color-cancelled); opacity: 0.75; }

/* ===================================================================== */
/* Order Header                                                           */
/* ===================================================================== */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.order-header-left { display: flex; align-items: center; gap: 10px; }
.order-header-right { display: flex; align-items: center; gap: 8px; }

.order-number {
  font-size: 26px;
  font-weight: 800;
  font-family: 'Inter', monospace;
  letter-spacing: -0.5px;
}

.order-timer {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 2px 10px;
  border-radius: 6px;
}
.order-timer.urgency-green { background: #ecfdf5; color: #059669; }
.order-timer.urgency-yellow { background: #fffbeb; color: #d97706; }
.order-timer.urgency-orange { background: #fff7ed; color: #ea580c; }
.order-timer.urgency-critical { background: #fef2f2; color: #dc2626; }

[data-theme="dark"] .order-timer.urgency-green { background: #064e3b40; }
[data-theme="dark"] .order-timer.urgency-yellow { background: #78350f40; }
[data-theme="dark"] .order-timer.urgency-orange { background: #7c2d1240; }
[data-theme="dark"] .order-timer.urgency-critical { background: #7f1d1d40; }

.prep-time-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-completed);
  padding: 2px 8px;
  background: #ecfdf5;
  border-radius: 6px;
}
[data-theme="dark"] .prep-time-badge { background: #064e3b40; }

.order-time { font-size: 12px; color: var(--color-text-muted); }

.print-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}
.print-btn:hover { background: var(--color-surface-alt); }

/* ===================================================================== */
/* Order Items                                                            */
/* ===================================================================== */
.order-items { padding: 14px 16px; }
.order-items ul { list-style: none; }

.item { margin-bottom: 10px; }
.item:last-child { margin-bottom: 0; }

.item-main { display: flex; align-items: center; gap: 8px; }

.quantity-badge {
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  min-width: 32px;
  text-align: center;
}

.item-name { font-weight: 600; font-size: 15px; }

.item-size {
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 1px 6px;
  background: var(--color-bg);
  border-radius: 4px;
}

.item-mods {
  margin-left: 40px;
  padding-left: 10px;
  border-left: 2px solid var(--color-border);
  font-size: 13px;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 3px;
}

/* ===================================================================== */
/* Order Notes                                                            */
/* ===================================================================== */
.order-notes { padding: 0 16px 12px; }

.order-notes p {
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-warning);
}

/* ===================================================================== */
/* Order Footer                                                           */
/* ===================================================================== */
.order-footer {
  padding: 12px 16px;
  background: var(--color-surface-alt);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.footer-info { display: flex; align-items: center; gap: 16px; }

.phone {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.total-amount {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-success);
}

/* ===================================================================== */
/* Action Buttons                                                         */
/* ===================================================================== */
.action-buttons { display: flex; gap: 8px; }

.action-btn {
  border: none;
  border-radius: var(--radius-md);
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.complete-btn {
  background: var(--color-success);
  color: white;
}
.complete-btn:hover { background: #047857; transform: scale(1.02); }
.complete-btn:active { transform: scale(0.98); }

.cancel-btn {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.cancel-btn:hover { background: #fef2f2; color: var(--color-danger); border-color: var(--color-danger); }

.action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* Status Badge (history) */
.status-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
}
.status-badge.completed { background: #ecfdf5; color: var(--color-completed); }
.status-badge.cancelled { background: #f9fafb; color: var(--color-cancelled); }
[data-theme="dark"] .status-badge.completed { background: #064e3b40; }
[data-theme="dark"] .status-badge.cancelled { background: #37415140; }

/* ===================================================================== */
/* Responsive — Tablet                                                    */
/* ===================================================================== */
@media (max-width: 1024px) {
  .header-stats { display: none; }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px;
    gap: 10px;
  }

  .header-left { justify-content: space-between; }

  .header-right {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 8px;
    align-items: center;
  }

  .view-toggle { grid-column: 1 / -1; }
  .view-toggle button { flex: 1; justify-content: center; }

  .orders-container { padding: 12px; }
  .orders-grid { grid-template-columns: 1fr; gap: 12px; }

  .order-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .footer-info { justify-content: space-between; }
  .action-buttons { display: grid; grid-template-columns: 1fr 1fr; }
  .action-btn { justify-content: center; }

  .prep-items { padding: 0 16px 12px; }
}

/* Tablet: 2 columns */
@media (min-width: 769px) and (max-width: 1200px) {
  .orders-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Large: 3 columns */
@media (min-width: 1201px) {
  .orders-grid { grid-template-columns: repeat(3, 1fr); }
}

/* ===================================================================== */
/* Print Styles — hide everything except ticket                          */
/* ===================================================================== */
@media print {
  .header, .error-banner, .prep-banner, .empty-state,
  .action-buttons, .print-btn, .status-control { display: none !important; }
  .orders-grid { display: block; }
  .order-card { break-inside: avoid; box-shadow: none; border: 1px solid #ccc; margin-bottom: 16px; }
}
</style>
