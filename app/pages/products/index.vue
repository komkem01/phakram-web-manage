<script setup lang="ts">
import type { ProductPayload } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, successMessage, products, paginate, fetchProducts, createProduct, updateProduct, deleteProduct } = useSystemProducts()
const categoryApi = useSystemCategories()

const form = reactive<ProductPayload>({ category_id: '', name_th: '', name_en: '', price: '', is_active: true })
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const isSubmitting = ref(false)
const editingId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

const categoryMap = computed(() => categoryApi.categories.value.reduce<Record<string, string>>((acc, item) => { acc[item.id] = item.name_th; return acc }, {}))

const toast = reactive({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

const isEditing = computed(() => Boolean(editingId.value))
const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))

function resetForm() {
  editingId.value = null
  form.category_id = ''
  form.name_th = ''
  form.name_en = ''
  form.price = ''
  form.is_active = true
}

function startEditRow(id: string) {
  const item = products.value.find((product) => product.id === id)
  if (!item) return

  editingId.value = item.id
  form.category_id = item.category_id
  form.name_th = item.name_th
  form.name_en = item.name_en
  form.price = String(item.price)
  form.is_active = item.is_active
}

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.type = type
  toast.message = message
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

async function load(page = 1) {
  currentPage.value = page
  await fetchProducts({ page, size: pageSize.value, sort_by: 'created_at', order_by: 'desc' })
}

function handlePageSizeChange() {
  void load(1)
}

async function handleSubmit() {
  const nameTh = String(form.name_th).trim()
  const nameEn = String(form.name_en).trim()
  const price = String(form.price).trim()

  if (!form.category_id || !nameTh || !nameEn || !price) {
    showToast('warning', 'กรุณากรอกข้อมูลให้ครบถ้วน')
    return
  }

  isSubmitting.value = true
  const payload: ProductPayload = {
    category_id: form.category_id,
    name_th: nameTh,
    name_en: nameEn,
    price,
    is_active: form.is_active
  }
  const success = editingId.value ? await updateProduct(editingId.value, payload) : await createProduct(payload)
  isSubmitting.value = false
  if (!success) return
  resetForm()
  await load(currentPage.value)
}

function openDeleteModal(id: string) { pendingDeleteId.value = id; isDeleteModalOpen.value = true }
function closeDeleteModal() { isDeleteModalOpen.value = false; pendingDeleteId.value = null }

async function handleDelete(id: string) {
  const success = await deleteProduct(id)
  if (!success) return
  if (products.value.length === 1 && currentPage.value > 1) {
    await load(currentPage.value - 1)
    return
  }
  await load(currentPage.value)
}

async function confirmDelete() {
  if (!pendingDeleteId.value) return
  const deleteId = pendingDeleteId.value
  closeDeleteModal()
  await handleDelete(deleteId)
}

watch(successMessage, (value) => { if (value) showToast('success', value) })
watch(errorMessage, (value) => { if (value) showToast('error', value) })

onMounted(async () => {
  await Promise.all([
    load(1),
    categoryApi.fetchCategories({ page: 1, size: 500, sort_by: 'name_th', order_by: 'asc' })
  ])
})

onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`">
        <svg v-if="toast.type === 'success'" class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <svg v-else-if="toast.type === 'error'" class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <svg v-else class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86l-7.15 12.4A2 2 0 004.86 19h14.28a2 2 0 001.72-2.74l-7.15-12.4a2 2 0 00-3.42 0z" /></svg>
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <div class="page-header">
      <h1 class="page-title">จัดการสินค้า - สินค้า</h1>
      <p class="page-subtitle">จัดการข้อมูลสินค้า</p>
    </div>

    <div class="content-card">
      <form class="card-section" @submit.prevent="handleSubmit">
        <h3 class="section-title">{{ isEditing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า' }}</h3>

        <div class="form-grid">
          <div class="form-group">
            <label for="category_id">หมวดหมู่สินค้า</label>
            <select id="category_id" v-model="form.category_id" :disabled="isSubmitting" required>
              <option value="">เลือกหมวดหมู่</option>
              <option v-for="item in categoryApi.categories.value" :key="item.id" :value="item.id">{{ item.name_th }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="name_th">ชื่อสินค้า (ไทย)</label>
            <input id="name_th" v-model="form.name_th" type="text" :disabled="isSubmitting" required>
          </div>
          <div class="form-group">
            <label for="name_en">ชื่อสินค้า (อังกฤษ)</label>
            <input id="name_en" v-model="form.name_en" type="text" :disabled="isSubmitting" required>
          </div>
          <div class="form-group">
            <label for="price">ราคา</label>
            <input id="price" v-model="form.price" type="number" step="0.01" min="0" :disabled="isSubmitting" required>
          </div>
        </div>

        <label class="checkbox-group"><input v-model="form.is_active" type="checkbox" :disabled="isSubmitting"><span>เปิดใช้งาน</span></label>

        <div class="form-actions">
          <button type="submit" class="btn-submit" :disabled="isSubmitting">{{ isEditing ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล' }}</button>
          <button v-if="isEditing" type="button" class="btn-secondary" :disabled="isSubmitting" @click="resetForm">ยกเลิก</button>
        </div>
      </form>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการสินค้า</h3>
          <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">รีเฟรช</button>
        </div>

        <div v-if="isLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูล...</p></div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>รหัสสินค้า</th><th>ชื่อ (ไทย)</th><th>ชื่อ (อังกฤษ)</th><th>หมวดหมู่</th><th>ราคา</th><th>สถานะ</th><th class="actions-col">จัดการ</th></tr></thead>
            <tbody>
              <tr v-if="products.length === 0"><td colspan="7" class="empty-cell">ไม่พบข้อมูล</td></tr>
              <tr v-for="item in products" :key="item.id">
                <td>{{ item.product_no }}</td>
                <td>{{ item.name_th }}</td>
                <td>{{ item.name_en }}</td>
                <td>{{ categoryMap[item.category_id] || '-' }}</td>
                <td>{{ item.price }}</td>
                <td><span class="badge" :class="item.is_active ? 'badge-success' : 'badge-muted'">{{ item.is_active ? 'ใช้งาน' : 'ปิดใช้งาน' }}</span></td>
                <td class="actions-col">
                  <NuxtLink class="action-link action-detail" :to="`/products/${item.id}/detail`">รายละเอียด</NuxtLink>
                  <NuxtLink class="action-link action-stock" :to="`/products/${item.id}/stock`">สต๊อก</NuxtLink>
                  <button class="action-link action-edit" @click="startEditRow(item.id)">แก้ไข</button>
                  <button class="action-link action-delete" @click="openDeleteModal(item.id)">ลบ</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-row">
          <label class="page-size-control">
            แสดง
            <select v-model.number="pageSize" :disabled="isLoading" @change="handlePageSizeChange">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
            รายการ
          </label>
          <button class="btn-secondary" :disabled="currentPage <= 1 || isLoading" @click="load(currentPage - 1)">ก่อนหน้า</button>
          <span>หน้า {{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-secondary" :disabled="currentPage >= totalPages || isLoading" @click="load(currentPage + 1)">ถัดไป</button>
        </div>
      </div>
    </div>

    <div v-if="isDeleteModalOpen" class="confirm-modal-overlay" @click="closeDeleteModal">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal-title">ยืนยันการลบข้อมูล</h3>
        <p class="confirm-modal-text">คุณต้องการลบข้อมูลสินค้านี้ใช่หรือไม่?</p>
        <div class="confirm-modal-actions">
          <button class="btn-secondary" @click="closeDeleteModal">ยกเลิก</button>
          <button class="btn-danger" @click="confirmDelete">ลบข้อมูล</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page { max-width: 1400px; margin: 0 auto; width: 100%; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
.content-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.card-section { padding: 24px; }
.section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 16px 0; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 600; color: #334155; }
.form-group input,.form-group select { height: 42px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 12px; font-size: 14px; outline: none; }
.form-group input:focus,.form-group select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12); }
.checkbox-group { display: inline-flex; align-items: center; gap: 8px; margin-top: 12px; color: #334155; }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-submit,.btn-secondary { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; }
.btn-submit { color: #fff; background: #4f46e5; }
.btn-submit:hover { background: #4338ca; }
.btn-secondary { color: #334155; background: #f8fafc; border-color: #d1d5db; }
.btn-secondary:hover { background: #f1f5f9; }
.btn-submit:disabled,.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.divider { border-top: 1px solid #e2e8f0; }
.table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th,.data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; }
.data-table th { background: #f8fafc; font-weight: 700; }
.empty-cell { text-align: center !important; color: #64748b !important; }
.actions-col { width: 280px; text-align: center !important; }
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge-success { color: #166534; background: #dcfce7; }
.badge-muted { color: #64748b; background: #e2e8f0; }
.action-link { display: inline-flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; font-weight: 600; cursor: pointer; margin-right: 8px; text-decoration: none; }
.action-detail { color: #1d4ed8; background: #eff6ff; border-color: #bfdbfe; }
.action-stock { color: #0f766e; background: #f0fdfa; border-color: #99f6e4; }
.action-edit { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.action-delete { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.pagination-row { margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; color: #334155; font-size: 14px; }
.page-size-control { display: inline-flex; align-items: center; gap: 8px; margin-right: 8px; }
.page-size-control select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }
.loading-container { display: flex; align-items: center; gap: 10px; color: #64748b; }
.loading-spinner { width: 22px; height: 22px; border-radius: 999px; border: 2px solid #cbd5e1; border-top-color: #4f46e5; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-notification { position: fixed; top: 88px; right: 24px; z-index: 80; display: flex; align-items: center; gap: 10px; min-width: 280px; max-width: 420px; padding: 12px 14px; border-radius: 10px; border: 1px solid; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15); font-size: 14px; font-weight: 600; }
.toast-success { background: #f0fdf4; border-color: #86efac; color: #166534; }
.toast-error { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
.toast-warning { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
.toast-icon { width: 18px; height: 18px; flex-shrink: 0; }
.toast-slide-enter-active,.toast-slide-leave-active { transition: all 0.2s ease; }
.toast-slide-enter-from,.toast-slide-leave-to { opacity: 0; transform: translateY(-8px); }
.confirm-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 90; }
.confirm-modal { width: min(92vw, 420px); background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22); }
.confirm-modal-title { margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1e293b; }
.confirm-modal-text { margin: 0; color: #475569; font-size: 14px; }
.confirm-modal-actions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
.btn-danger { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; color: #fff; background: #dc2626; }
.btn-danger:hover { background: #b91c1c; }
</style>
