<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'


  interface OrderItem {
    name: string
    quantity: number
    size: string | null
    modifications: string
    price: number
  }

  interface Order {
    orderNumber: string
    items: OrderItem[]
    phoneNumber: string
    timeOrdered: Date
    totalPrice: number
    status: string 
  }
  const orders = ref<Order[]>([])
  const viewMode = ref<'current' | 'history'>('current')

  // Computed property to filter orders based on view mode
  const filteredOrders = computed(() => {
    if (viewMode.value === 'current') {
      return orders.value.filter(order => order.status === 'pending')
    } else {
      return orders.value.filter(order => order.status === 'completed' || order.status === 'cancelled')
    }
  })

  // Fetch existing orders from the database on startup
  async function fetchExistingOrders() {
    try {
      const response = await fetch('http://localhost:8080/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      
      const existingOrders = await response.json()
      
      // Map the response to match Order interface
      orders.value = existingOrders.map((order: any) => ({
        orderNumber: order.orderNumber,
        items: order.items,
        phoneNumber: order.phoneNumber,
        timeOrdered: new Date(order.time),
        totalPrice: order.total,
        status: order.status
      }))
      
      console.log(`📦 Loaded ${orders.value.length} existing orders`)
    } catch (error) {
      console.error('Failed to fetch existing orders:', error)
    }
  }

  // Load existing orders when component mounts
  onMounted(() => {
    fetchExistingOrders()
  })

  const ws = new WebSocket('ws://localhost:8080');

  ws.onopen = () => {
    console.log('✅ Connected to order stream!');
    console.log('📺 Waiting for orders...\n');
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'welcome') {
      console.log('👋', message.message);
    } else if (message.type === 'new_order') {
      // Add new order to the beginning of the list
      orders.value.unshift({
        orderNumber: message.payload.orderNumber,
        items: message.payload.items,
        phoneNumber: message.payload.phoneNumber,
        timeOrdered: new Date(message.payload.time),
        totalPrice: message.payload.total,
        status: message.payload.status || 'pending'
      });
    }
  };



  defineProps<{
    order: Order
  }>()

  function formatDate(date: Date): Array<string> {
    const d = new Date(date)
    const dateStr = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric'})
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return [dateStr, timeStr]
  }


  const todayDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
})

  function formatPhone(phone: string): string {
    // Format as (XXX) XXX-XXXX if 10 digits
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  function formatStatus(status: string): string {
  if (!status) return 'Unknown'
  if (status === 'pending') return 'In Progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`
  }

  async function updateOrderStatus(order: Order, newStatus: string) {
    try {
      const response = await fetch(`http://localhost:8080/api/orders/${order.orderNumber}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        order.status = newStatus
      }
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  }

  </script>

  <template>
    <div class="header">
      <h1>Far East Chinese Restaurant <span class = "date">{{ todayDate }}</span></h1>
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

        <!-- Toggle Status Button -->
        <!-- Order Number + Status Dropdown (combined) -->
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
    </div>
  </template>

  <style scoped>
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
  .orders-container {
    display:flex;
    flex-direction: column;
    gap: 16px; 
    padding: 20px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);

    height: 700px;              /* Adjust this to your desired height */
    width: 1280px;
    margin: 0 auto;
    overflow-y: auto;           /* Enable vertical scrolling */
    overflow-x: hidden;         /* Hide horizontal scroll */
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
    padding: 4px, 10px;
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
    content: "•";
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
  
  .item-mods {
    font-size: 13px;
    color: #888;
    font-style: italic;
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
  </style>