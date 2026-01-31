<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

// Types
interface MenuItem {
  id: number
  item_number: string | null
  name: string
  description: string | null
  price_small: number | null
  price_large: number | null
  price_single: number | null
  included: string | null
  category: string
  is_spicy: number
}

// State
const menuItems = ref<MenuItem[]>([])
const categories = ref<string[]>([])
const selectedCategory = ref<string>('all')
const searchQuery = ref('')
const isLoading = ref(true)
const error = ref<string | null>(null)

// Edit modal state
const showEditModal = ref(false)
const editingItem = ref<Partial<MenuItem> | null>(null)
const isNewItem = ref(false)
const isSaving = ref(false)

// Computed
const filteredItems = computed(() => {
  let items = menuItems.value

  // Filter by category
  if (selectedCategory.value !== 'all') {
    items = items.filter(item => item.category === selectedCategory.value)
  }

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.item_number?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    )
  }

  return items
})

// API Functions
async function fetchMenuItems(): Promise<void> {
  try {
    isLoading.value = true
    error.value = null
    const response = await fetch(`${API_BASE_URL}/api/menu`)
    if (!response.ok) throw new Error('Failed to fetch menu')
    menuItems.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load menu'
  } finally {
    isLoading.value = false
  }
}

async function fetchCategories(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/menu/categories`)
    if (!response.ok) throw new Error('Failed to fetch categories')
    categories.value = await response.json()
  } catch (err) {
    console.error('Failed to load categories:', err)
  }
}

async function saveMenuItem(): Promise<void> {
  if (!editingItem.value || !editingItem.value.name || !editingItem.value.category) {
    error.value = 'Name and category are required'
    return
  }

  isSaving.value = true
  error.value = null

  try {
    const url = isNewItem.value
      ? `${API_BASE_URL}/api/menu`
      : `${API_BASE_URL}/api/menu/${editingItem.value.id}`

    const method = isNewItem.value ? 'POST' : 'PUT'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem.value),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to save')
    }

    closeEditModal()
    await fetchMenuItems()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save item'
  } finally {
    isSaving.value = false
  }
}

async function deleteMenuItem(id: number): Promise<void> {
  if (!confirm('Are you sure you want to delete this menu item?')) return

  try {
    error.value = null
    const response = await fetch(`${API_BASE_URL}/api/menu/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete')
    await fetchMenuItems()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete item'
  }
}

// Modal Functions
function openNewItemModal(): void {
  editingItem.value = {
    name: '',
    item_number: '',
    description: '',
    price_small: null,
    price_large: null,
    price_single: null,
    included: '',
    category: categories.value[0] || 'Appetizers',
    is_spicy: 0,
  }
  isNewItem.value = true
  showEditModal.value = true
}

function openEditModal(item: MenuItem): void {
  editingItem.value = { ...item }
  isNewItem.value = false
  showEditModal.value = true
}

function closeEditModal(): void {
  showEditModal.value = false
  editingItem.value = null
  isNewItem.value = false
}

// Format price display
function formatPrice(price: number | null): string {
  if (price === null) return '-'
  return `$${price.toFixed(2)}`
}

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchMenuItems(), fetchCategories()])
})
</script>

<template>
  <div class="menu-management">
    <!-- Header -->
    <div class="menu-header">
      <h2>Menu Management</h2>
      <button class="add-btn" @click="openNewItemModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Item
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search menu items..."
        />
      </div>
      <select v-model="selectedCategory" class="category-select">
        <option value="all">All Categories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="error = null">Dismiss</button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading">Loading menu items...</div>

    <!-- Menu Table -->
    <div v-else class="table-container">
      <table class="menu-table">
        <thead>
          <tr>
            <th class="col-number">#</th>
            <th class="col-name">Name</th>
            <th class="col-category">Category</th>
            <th class="col-price">Pt/Small</th>
            <th class="col-price">Qt/Large</th>
            <th class="col-price">Single</th>
            <th class="col-spicy">Spicy</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td class="col-number">{{ item.item_number || '-' }}</td>
            <td class="col-name">
              <div class="item-name">{{ item.name }}</div>
              <div v-if="item.description" class="item-desc">{{ item.description }}</div>
            </td>
            <td class="col-category">
              <span class="category-tag">{{ item.category }}</span>
            </td>
            <td class="col-price">{{ formatPrice(item.price_small) }}</td>
            <td class="col-price">{{ formatPrice(item.price_large) }}</td>
            <td class="col-price">{{ formatPrice(item.price_single) }}</td>
            <td class="col-spicy">
              <span v-if="item.is_spicy" class="spicy-badge" title="Spicy">🌶️</span>
            </td>
            <td class="col-actions">
              <button class="action-btn edit" @click="openEditModal(item)" title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="action-btn delete" @click="deleteMenuItem(item.id)" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredItems.length === 0" class="empty-state">
        <p>No menu items found</p>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isNewItem ? 'Add Menu Item' : 'Edit Menu Item' }}</h3>
          <button class="close-btn" @click="closeEditModal">&times;</button>
        </div>

        <form @submit.prevent="saveMenuItem" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>Item Number</label>
              <input v-model="editingItem!.item_number" type="text" placeholder="e.g., C16" />
            </div>
            <div class="form-group flex-2">
              <label>Name *</label>
              <input v-model="editingItem!.name" type="text" required />
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea v-model="editingItem!.description" rows="2"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select v-model="editingItem!.category" required>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Included</label>
              <input v-model="editingItem!.included" type="text" placeholder="e.g., White Rice" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Price (Pt/Small)</label>
              <input v-model.number="editingItem!.price_small" type="number" step="0.01" min="0" />
            </div>
            <div class="form-group">
              <label>Price (Qt/Large)</label>
              <input v-model.number="editingItem!.price_large" type="number" step="0.01" min="0" />
            </div>
            <div class="form-group">
              <label>Price (Single)</label>
              <input v-model.number="editingItem!.price_single" type="number" step="0.01" min="0" />
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input v-model="editingItem!.is_spicy" type="checkbox" :true-value="1" :false-value="0" />
              Spicy Item
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeEditModal">Cancel</button>
            <button type="submit" class="btn-save" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-management {
  padding: 24px;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.menu-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.search-box svg {
  color: #94a3b8;
}

.category-select {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  min-width: 180px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  margin-bottom: 16px;
  font-size: 14px;
}

.error-message button {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid currentColor;
  background: transparent;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #64748b;
}

.table-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

.menu-table {
  width: 100%;
  border-collapse: collapse;
}

.menu-table th {
  background: #f8fafc;
  padding: 14px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.menu-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

.menu-table tr:hover {
  background: #f8fafc;
}

.col-number { width: 60px; }
.col-name { min-width: 200px; }
.col-category { width: 140px; }
.col-price { width: 90px; text-align: right; font-family: monospace; }
.col-spicy { width: 60px; text-align: center; }
.col-actions { width: 100px; text-align: center; }

.item-name {
  font-weight: 600;
  color: #1e293b;
}

.item-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.4;
}

.category-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.spicy-badge {
  font-size: 16px;
}

.action-btn {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn.edit {
  color: #3b82f6;
}

.action-btn.edit:hover {
  background: #eff6ff;
}

.action-btn.delete {
  color: #ef4444;
}

.action-btn.delete:hover {
  background: #fef2f2;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #64748b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  color: #64748b;
}

.close-btn:hover {
  background: #e2e8f0;
}

.modal-form {
  padding: 24px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group {
  flex: 1;
  margin-bottom: 16px;
}

.form-group.flex-2 {
  flex: 2;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.15s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #c41e3a;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  margin-top: 8px;
}

.btn-cancel,
.btn-save {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
}

.btn-cancel:hover {
  background: #f8fafc;
}

.btn-save {
  border: none;
  background: linear-gradient(135deg, #c41e3a 0%, #a01830 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .filters {
    flex-direction: column;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .modal {
    margin: 16px;
    max-height: calc(100vh - 32px);
  }
}
</style>
