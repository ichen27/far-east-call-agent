<template>
  <div class="analytics-dashboard">
    <!-- Date Range Selector -->
    <div class="date-controls">
      <div class="date-range">
        <label>
          From:
          <input type="date" v-model="startDate" @change="fetchAnalytics" />
        </label>
        <label>
          To:
          <input type="date" v-model="endDate" @change="fetchAnalytics" />
        </label>
      </div>
      <div class="quick-ranges">
        <button @click="setDateRange(7)" :class="{ active: dateRangeDays === 7 }">7 Days</button>
        <button @click="setDateRange(30)" :class="{ active: dateRangeDays === 30 }">30 Days</button>
        <button @click="setDateRange(90)" :class="{ active: dateRangeDays === 90 }">90 Days</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="card">
        <div class="card-title">Total Orders</div>
        <div class="card-value">{{ summary.totalOrders }}</div>
        <div v-if="dashboard.comparison" class="card-change" :class="{ positive: dashboard.comparison.orderChange > 0, negative: dashboard.comparison.orderChange < 0 }">
          {{ dashboard.comparison.orderChange > 0 ? '+' : '' }}{{ dashboard.comparison.orderChange }}% vs yesterday
        </div>
      </div>
      <div class="card">
        <div class="card-title">Total Revenue</div>
        <div class="card-value">${{ summary.totalRevenue?.toFixed(2) || '0.00' }}</div>
        <div v-if="dashboard.comparison" class="card-change" :class="{ positive: dashboard.comparison.revenueChange > 0, negative: dashboard.comparison.revenueChange < 0 }">
          {{ dashboard.comparison.revenueChange > 0 ? '+' : '' }}{{ dashboard.comparison.revenueChange }}% vs yesterday
        </div>
      </div>
      <div class="card">
        <div class="card-title">Avg Order Value</div>
        <div class="card-value">${{ summary.avgOrderValue?.toFixed(2) || '0.00' }}</div>
      </div>
      <div class="card">
        <div class="card-title">Unique Customers</div>
        <div class="card-value">{{ summary.uniqueCustomers }}</div>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="charts-row">
      <div class="chart-container large">
        <h3>Revenue Over Time</h3>
        <Line v-if="revenueChartData.labels.length > 0" :data="revenueChartData" :options="lineChartOptions" />
        <div v-else class="no-data">No data available</div>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="charts-row">
      <div class="chart-container">
        <h3>Orders by Status</h3>
        <Doughnut v-if="statusChartData.labels.length > 0" :data="statusChartData" :options="doughnutOptions" />
        <div v-else class="no-data">No data available</div>
      </div>
      <div class="chart-container">
        <h3>Revenue by Category</h3>
        <Doughnut v-if="categoryChartData.labels.length > 0" :data="categoryChartData" :options="doughnutOptions" />
        <div v-else class="no-data">No data available</div>
      </div>
    </div>

    <!-- Charts Row 3 -->
    <div class="charts-row">
      <div class="chart-container">
        <h3>Orders by Hour</h3>
        <Bar v-if="hourlyChartData.labels.length > 0" :data="hourlyChartData" :options="barChartOptions" />
        <div v-else class="no-data">No data available</div>
      </div>
      <div class="chart-container">
        <h3>Top 10 Popular Items</h3>
        <Bar v-if="popularItemsChartData.labels.length > 0" :data="popularItemsChartData" :options="horizontalBarOptions" />
        <div v-else class="no-data">No data available</div>
      </div>
    </div>

    <!-- Popular Items Table -->
    <div class="popular-items-table">
      <h3>Popular Items Details</h3>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Item Name</th>
            <th>Qty Sold</th>
            <th>Revenue</th>
            <th>Orders</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in popularItems" :key="item.name">
            <td>{{ index + 1 }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.total_quantity }}</td>
            <td>${{ item.total_revenue?.toFixed(2) || '0.00' }}</td>
            <td>{{ item.order_count }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Date range state
const dateRangeDays = ref(30)
const endDate = ref(new Date().toISOString().slice(0, 10))
const startDate = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))

// Analytics data
const summary = ref<{
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
  uniqueCustomers: number
}>({
  totalOrders: 0,
  totalRevenue: 0,
  avgOrderValue: 0,
  uniqueCustomers: 0,
})

const dailyStats = ref<Array<{
  date: string
  order_count: number
  revenue: number
  avg_order_value: number
}>>([])

const statusBreakdown = ref<Array<{ status: string; count: number }>>([])
const hourlyDistribution = ref<Array<{ hour: number; order_count: number }>>([])
const popularItems = ref<Array<{
  name: string
  total_quantity: number
  total_revenue: number
  order_count: number
}>>([])
const categoryRevenue = ref<Array<{ category: string; revenue: number; quantity: number }>>([])
const dashboard = ref<{
  today?: { orders: number; revenue: number; pendingOrders: number }
  comparison?: { orderChange: number; revenueChange: number }
}>({})

// Chart color palettes
const colors = {
  primary: '#c41e3a',
  secondary: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
  warning: '#eab308',
  danger: '#ef4444',
  muted: '#6b7280',
}

const statusColors: Record<string, string> = {
  pending: colors.warning,
  confirmed: colors.info,
  preparing: colors.secondary,
  ready: colors.success,
  completed: '#10b981',
  cancelled: colors.danger,
}

const categoryColors = [
  '#c41e3a', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
]

// Chart data computed properties
const revenueChartData = computed(() => ({
  labels: dailyStats.value.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
  datasets: [
    {
      label: 'Revenue ($)',
      data: dailyStats.value.map(d => d.revenue || 0),
      borderColor: colors.primary,
      backgroundColor: 'rgba(196, 30, 58, 0.1)',
      fill: true,
      tension: 0.4,
    },
    {
      label: 'Orders',
      data: dailyStats.value.map(d => d.order_count),
      borderColor: colors.info,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: false,
      tension: 0.4,
      yAxisID: 'y1',
    },
  ],
}))

const statusChartData = computed(() => ({
  labels: statusBreakdown.value.map(s => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
  datasets: [{
    data: statusBreakdown.value.map(s => s.count),
    backgroundColor: statusBreakdown.value.map(s => statusColors[s.status] || colors.muted),
  }],
}))

const categoryChartData = computed(() => ({
  labels: categoryRevenue.value.map(c => c.category),
  datasets: [{
    data: categoryRevenue.value.map(c => c.revenue),
    backgroundColor: categoryColors.slice(0, categoryRevenue.value.length),
  }],
}))

const hourlyChartData = computed(() => {
  // Fill in missing hours with 0
  const hourData = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyDistribution.value.find(h => h.hour === i)
    return found ? found.order_count : 0
  })

  return {
    labels: Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12
      const ampm = i < 12 ? 'AM' : 'PM'
      return `${hour}${ampm}`
    }),
    datasets: [{
      label: 'Orders',
      data: hourData,
      backgroundColor: 'rgba(196, 30, 58, 0.7)',
      borderColor: colors.primary,
      borderWidth: 1,
    }],
  }
})

const popularItemsChartData = computed(() => ({
  labels: popularItems.value.slice(0, 10).map(i => i.name.length > 20 ? i.name.slice(0, 20) + '...' : i.name),
  datasets: [{
    label: 'Quantity Sold',
    data: popularItems.value.slice(0, 10).map(i => i.total_quantity),
    backgroundColor: 'rgba(196, 30, 58, 0.7)',
    borderColor: colors.primary,
    borderWidth: 1,
  }],
}))

// Chart options
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
  },
  scales: {
    y: {
      type: 'linear' as const,
      position: 'left' as const,
      title: { display: true, text: 'Revenue ($)' },
    },
    y1: {
      type: 'linear' as const,
      position: 'right' as const,
      title: { display: true, text: 'Orders' },
      grid: { drawOnChartArea: false },
    },
  },
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: { beginAtZero: true },
  },
}

const horizontalBarOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { beginAtZero: true },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
}

// Functions
function setDateRange(days: number) {
  dateRangeDays.value = days
  endDate.value = new Date().toISOString().slice(0, 10)
  startDate.value = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  fetchAnalytics()
}

async function fetchAnalytics() {
  const params = `startDate=${startDate.value}&endDate=${endDate.value}`

  try {
    const [orderRes, popularRes, categoryRes, dashboardRes] = await Promise.all([
      fetch(`${API_BASE}/api/analytics/orders?${params}`),
      fetch(`${API_BASE}/api/analytics/popular-items?${params}&limit=10`),
      fetch(`${API_BASE}/api/analytics/category-revenue?${params}`),
      fetch(`${API_BASE}/api/analytics/dashboard`),
    ])

    if (orderRes.ok) {
      const data = await orderRes.json()
      dailyStats.value = data.dailyStats || []
      summary.value = data.summary || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, uniqueCustomers: 0 }
      statusBreakdown.value = data.statusBreakdown || []
      hourlyDistribution.value = data.hourlyDistribution || []
    }

    if (popularRes.ok) {
      popularItems.value = await popularRes.json()
    }

    if (categoryRes.ok) {
      categoryRevenue.value = await categoryRes.json()
    }

    if (dashboardRes.ok) {
      dashboard.value = await dashboardRes.json()
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
  }
}

onMounted(() => {
  fetchAnalytics()
})
</script>

<style scoped>
.analytics-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.date-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.date-range {
  display: flex;
  gap: 16px;
}

.date-range label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}

.date-range input {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}

.quick-ranges {
  display: flex;
  gap: 8px;
}

.quick-ranges button {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.quick-ranges button:hover {
  background: #e5e7eb;
}

.quick-ranges button.active {
  background: #c41e3a;
  color: white;
  border-color: #c41e3a;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.card-change {
  font-size: 13px;
  margin-top: 8px;
}

.card-change.positive {
  color: #22c55e;
}

.card-change.negative {
  color: #ef4444;
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.chart-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

.chart-container.large {
  grid-column: 1 / -1;
}

.chart-container h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #374151;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
  font-size: 14px;
}

.popular-items-table {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.popular-items-table h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #374151;
}

.popular-items-table table {
  width: 100%;
  border-collapse: collapse;
}

.popular-items-table th,
.popular-items-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.popular-items-table th {
  font-weight: 600;
  color: #6b7280;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.popular-items-table td {
  color: #374151;
}

.popular-items-table tr:hover td {
  background: #f9fafb;
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }

  .date-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
