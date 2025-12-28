<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface OrderItem {
  name: string
  quantity: number
  price: number
  notes?: string
}

interface Order {
  id: number
  items: OrderItem[]
  phone_number: string
  customer_name?: string
  total: number
  status: 'pending' | 'preparing' | 'ready' | 'completed'
  created_at: string
}

const orders = ref<Order[]>([])
const isConnected = ref(false)
const error = ref<string | null>(null)
let pollInterval: number | null = null

const API_BASE = 'http://localhost:3000'
const POLL_INTERVAL_MS = 3000 // Poll every 3 seconds

// Group orders by status
const pendingOrders = computed(() => orders.value.filter(o => o.status === 'pending'))
const preparingOrders = computed(() => orders.value.filter(o => o.status === 'preparing'))
const readyOrders = computed(() => orders.value.filter(o => o.status === 'ready'))

async function fetchOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`)
    if (!res.ok) throw new Error('Failed to fetch orders')
    orders.value = await res.json()
    isConnected.value = true
    error.value = null
  } catch (e) {
    isConnected.value = false
    error.value = 'Could not load orders'
    console.error(e)
  }
}

function startPolling() {
  // Initial fetch
  fetchOrders()
  // Poll every 3 seconds
  pollInterval = window.setInterval(fetchOrders, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function updateStatus(orderId: number, status: Order['status']) {
  try {
    await fetch(`${API_BASE}/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    // Refresh immediately after update
    await fetchOrders()
  } catch (e) {
    console.error('Failed to update order status:', e)
  }
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  }
  return phone
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="orders-container">
    <header class="orders-header">
      <div class="brand">
        <span class="brand-icon">🥡</span>
        <h1>Far East Kitchen</h1>
        <span class="subtitle">Order Dashboard</span>
      </div>
      <div class="connection-status" :class="{ connected: isConnected }">
        <span class="status-dot"></span>
        {{ isConnected ? 'Live' : 'Reconnecting...' }}
      </div>
    </header>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div class="orders-grid">
      <!-- Pending Column -->
      <section class="order-column pending">
        <div class="column-header">
          <h2>🔔 New Orders</h2>
          <span class="count">{{ pendingOrders.length }}</span>
        </div>
        <TransitionGroup name="order" tag="div" class="order-list">
          <article v-for="order in pendingOrders" :key="order.id" class="order-card">
            <div class="order-meta">
              <span class="order-id">#{{ order.id }}</span>
              <span class="order-time">{{ formatTime(order.created_at) }}</span>
            </div>
            <div class="customer-info">
              <span class="customer-name">{{ order.customer_name || 'Guest' }}</span>
              <span class="customer-phone">{{ formatPhone(order.phone_number) }}</span>
            </div>
            <ul class="items-list">
              <li v-for="(item, idx) in order.items" :key="idx">
                <span class="item-qty">{{ item.quantity }}×</span>
                <span class="item-name">{{ item.name }}</span>
                <span v-if="item.notes" class="item-notes">{{ item.notes }}</span>
              </li>
            </ul>
            <div class="order-footer">
              <span class="order-total">${{ order.total.toFixed(2) }}</span>
              <button class="action-btn" @click="updateStatus(order.id, 'preparing')">
                Start Preparing →
              </button>
            </div>
          </article>
        </TransitionGroup>
        <div v-if="pendingOrders.length === 0" class="empty-state">
          No new orders
        </div>
      </section>

      <!-- Preparing Column -->
      <section class="order-column preparing">
        <div class="column-header">
          <h2>🔥 Preparing</h2>
          <span class="count">{{ preparingOrders.length }}</span>
        </div>
        <TransitionGroup name="order" tag="div" class="order-list">
          <article v-for="order in preparingOrders" :key="order.id" class="order-card">
            <div class="order-meta">
              <span class="order-id">#{{ order.id }}</span>
              <span class="order-time">{{ formatTime(order.created_at) }}</span>
            </div>
            <div class="customer-info">
              <span class="customer-name">{{ order.customer_name || 'Guest' }}</span>
              <span class="customer-phone">{{ formatPhone(order.phone_number) }}</span>
            </div>
            <ul class="items-list">
              <li v-for="(item, idx) in order.items" :key="idx">
                <span class="item-qty">{{ item.quantity }}×</span>
                <span class="item-name">{{ item.name }}</span>
              </li>
            </ul>
            <div class="order-footer">
              <span class="order-total">${{ order.total.toFixed(2) }}</span>
              <button class="action-btn" @click="updateStatus(order.id, 'ready')">
                Mark Ready ✓
              </button>
            </div>
          </article>
        </TransitionGroup>
        <div v-if="preparingOrders.length === 0" class="empty-state">
          Nothing cooking
        </div>
      </section>

      <!-- Ready Column -->
      <section class="order-column ready">
        <div class="column-header">
          <h2>✅ Ready for Pickup</h2>
          <span class="count">{{ readyOrders.length }}</span>
        </div>
        <TransitionGroup name="order" tag="div" class="order-list">
          <article v-for="order in readyOrders" :key="order.id" class="order-card">
            <div class="order-meta">
              <span class="order-id">#{{ order.id }}</span>
              <span class="order-time">{{ formatTime(order.created_at) }}</span>
            </div>
            <div class="customer-info">
              <span class="customer-name">{{ order.customer_name || 'Guest' }}</span>
              <span class="customer-phone">{{ formatPhone(order.phone_number) }}</span>
            </div>
            <ul class="items-list compact">
              <li v-for="(item, idx) in order.items" :key="idx">
                {{ item.quantity }}× {{ item.name }}
              </li>
            </ul>
            <div class="order-footer">
              <span class="order-total">${{ order.total.toFixed(2) }}</span>
              <button class="action-btn complete" @click="updateStatus(order.id, 'completed')">
                Complete
              </button>
            </div>
          </article>
        </TransitionGroup>
        <div v-if="readyOrders.length === 0" class="empty-state">
          No orders ready
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Playfair+Display:wght@600&display=swap');

.orders-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 1.5rem;
  font-family: 'Noto Sans SC', system-ui, sans-serif;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 200, 87, 0.2);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 2rem;
}

.brand h1 {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  color: #ffc857;
  margin: 0;
  letter-spacing: 0.5px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  padding-left: 0.75rem;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 20px;
  font-size: 0.875rem;
  color: #fca5a5;
}

.connection-status.connected {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse 2s infinite;
}

.connection-status.connected .status-dot {
  background: #22c55e;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.error-banner {
  background: #7f1d1d;
  color: #fecaca;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.order-column {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 1rem;
  min-height: 70vh;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
}

.order-column.pending .column-header {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
  border-left: 3px solid #fbbf24;
}

.order-column.preparing .column-header {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.1));
  border-left: 3px solid #f97316;
}

.order-column.ready .column-header {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1));
  border-left: 3px solid #22c55e;
}

.column-header h2 {
  font-size: 1rem;
  font-weight: 500;
  color: #fff;
  margin: 0;
}

.count {
  background: rgba(255, 255, 255, 0.15);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-card {
  background: rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.order-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.order-id {
  font-weight: 700;
  color: #ffc857;
  font-size: 1.1rem;
}

.order-time {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  margin-bottom: 0.75rem;
}

.customer-name {
  font-weight: 500;
  color: #fff;
}

.customer-phone {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
}

.items-list li {
  padding: 0.4rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.item-qty {
  color: #ffc857;
  font-weight: 600;
  min-width: 2rem;
}

.item-notes {
  font-size: 0.8rem;
  color: rgba(255, 200, 87, 0.7);
  font-style: italic;
  width: 100%;
  padding-left: 2rem;
}

.items-list.compact li {
  display: inline;
}

.items-list.compact li:not(:last-child)::after {
  content: ', ';
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.order-total {
  font-size: 1.25rem;
  font-weight: 700;
  color: #86efac;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #ffc857, #f59e0b);
  color: #1a1a2e;
}

.action-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(255, 200, 87, 0.4);
}

.action-btn.complete {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

/* Transition animations */
.order-enter-active {
  animation: slideIn 0.4s ease-out;
}

.order-leave-active {
  animation: slideOut 0.3s ease-in;
}

.order-move {
  transition: transform 0.4s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

@media (max-width: 1024px) {
  .orders-grid {
    grid-template-columns: 1fr;
  }
  
  .order-column {
    min-height: auto;
  }
}
</style>