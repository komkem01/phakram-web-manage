<script setup lang="ts">
import type { PrefixPayload } from '~/types/settings'

definePageMeta({
  layout: 'dashboard'
})

const {
  isLoading,
  errorMessage,
  successMessage,
  prefixes,
  paginate,
  fetchPrefixes,
  createPrefix,
  updatePrefix,
  deletePrefix
} = useSystemPrefixes()

const {
  genders,
  fetchGenders
} = useSystemGenders()

const form = reactive<PrefixPayload>({
  name_th: '',
  name_en: '',
  gender_id: '',
  is_active: true
})

const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const isSubmitting = ref(false)
const editingId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

const toast = reactive({
  show: false,
  type: 'success' as 'success' | 'error' | 'warning',
  message: ''
})

let toastTimer: ReturnType<typeof setTimeout> | null = null

const isEditing = computed(() => Boolean(editingId.value))
const totalPages = computed(() => {
  if (!paginate.value.size) {
    return 1
  }
  return Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))
})

const genderMap = computed(() => {
  return genders.value.reduce<Record<string, string>>((accumulator, gender) => {
    accumulator[gender.id] = gender.name_th
    return accumulator
  }, {})
})

function resetForm() {
  editingId.value = null
  form.name_th = ''
  form.name_en = ''
  form.gender_id = ''
  form.is_active = true
}

function startEditRow(id: string) {
  const item = prefixes.value.find((prefix) => prefix.id === id)
  if (!item) {
    return
  }

  editingId.value = item.id
  form.name_th = item.name_th
  form.name_en = item.name_en
  form.gender_id = item.gender_id
  form.is_active = item.is_active
}

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  toast.show = true
  toast.type = type
  toast.message = message

  toastTimer = setTimeout(() => {
    toast.show = false
  }, 3000)
}

async function load(page = 1) {
  currentPage.value = page
  await fetchPrefixes({
    page,
    size: pageSize.value,
    sort_by: 'created_at',
    order_by: 'desc'
  })
}

function handlePageSizeChange() {
  void load(1)
}

async function loadGenders() {
  await fetchGenders({
    page: 1,
    size: 100,
    sort_by: 'created_at',
    order_by: 'desc'
  })

  if (!form.gender_id && genders.value.length > 0) {
    form.gender_id = genders.value[0].id
  }
}

async function handleSubmit() {
  if (!form.name_th.trim() || !form.name_en.trim() || !form.gender_id) {
    showToast('warning', 'กรุณากรอกข้อมูลให้ครบถ้วน')
    return
  }

  isSubmitting.value = true

  const payload: PrefixPayload = {
    name_th: form.name_th.trim(),
    name_en: form.name_en.trim(),
    gender_id: form.gender_id,
    is_active: form.is_active
  }

  const success = editingId.value
    ? await updatePrefix(editingId.value, payload)
    : await createPrefix(payload)

  isSubmitting.value = false

  if (!success) {
    return
  }

  resetForm()
  if (genders.value.length > 0) {
    form.gender_id = genders.value[0].id
  }

  await load(currentPage.value)
}

function openDeleteModal(id: string) {
  pendingDeleteId.value = id
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
  pendingDeleteId.value = null
}

async function handleDelete(id: string) {
  const success = await deletePrefix(id)
  if (!success) {
    return
  }

  if (prefixes.value.length === 1 && currentPage.value > 1) {
    await load(currentPage.value - 1)
    return
  }

  await load(currentPage.value)
}

async function confirmDelete() {
  if (!pendingDeleteId.value) {
    return
  }

  const deleteId = pendingDeleteId.value
  closeDeleteModal()
  await handleDelete(deleteId)
}

watch(successMessage, (value) => {
  if (value) {
    showToast('success', value)
  }
})

watch(errorMessage, (value) => {
  if (value) {
    showToast('error', value)
  }
})

onMounted(async () => {
  await loadGenders()
  await load(1)
})

onBeforeUnmount(() => {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
})
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`">
        <svg v-if="toast.type === 'success'" class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="toast.type === 'error'" class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86l-7.15 12.4A2 2 0 004.86 19h14.28a2 2 0 001.72-2.74l-7.15-12.4a2 2 0 00-3.42 0z" />
        </svg>
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <div class="page-header">
      <div>
        <h1 class="page-title">ตั้งค่าพื้นฐาน - คำนำหน้า</h1>
        <p class="page-subtitle">จัดการข้อมูลคำนำหน้าสำหรับระบบสมาชิก</p>
      </div>
    </div>

    <div class="content-card">
      <form class="card-section" @submit.prevent="handleSubmit">
        <h3 class="section-title">{{ isEditing ? 'แก้ไขคำนำหน้า' : 'เพิ่มคำนำหน้า' }}</h3>

        <div class="form-grid">
          <div class="form-group">
            <label for="name_th">ชื่อ (ไทย)</label>
            <input id="name_th" v-model="form.name_th" type="text" :disabled="isSubmitting" required>
          </div>
          <div class="form-group">
            <label for="name_en">ชื่อ (อังกฤษ)</label>
            <input id="name_en" v-model="form.name_en" type="text" :disabled="isSubmitting" required>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="gender_id">เพศ</label>
            <select id="gender_id" v-model="form.gender_id" :disabled="isSubmitting" required>
              <option value="" disabled>เลือกเพศ</option>
              <option v-for="gender in genders" :key="gender.id" :value="gender.id">
                {{ gender.name_th }}
              </option>
            </select>
          </div>
        </div>

        <label class="checkbox-group">
          <input v-model="form.is_active" type="checkbox" :disabled="isSubmitting">
          <span>เปิดใช้งาน</span>
        </label>

        <div class="form-actions">
          <button type="submit" class="btn-submit" :disabled="isSubmitting">
            {{ isEditing ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล' }}
          </button>
          <button v-if="isEditing" type="button" class="btn-secondary" :disabled="isSubmitting" @click="resetForm">
            ยกเลิก
          </button>
        </div>
      </form>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการคำนำหน้า</h3>
          <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">
            รีเฟรช
          </button>
        </div>

        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>ชื่อ (ไทย)</th>
                <th>ชื่อ (อังกฤษ)</th>
                <th>เพศ</th>
                <th>สถานะ</th>
                <th class="actions-col">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="prefixes.length === 0">
                <td colspan="5" class="empty-cell">ไม่พบข้อมูล</td>
              </tr>
              <tr v-for="item in prefixes" :key="item.id">
                <td>{{ item.name_th }}</td>
                <td>{{ item.name_en }}</td>
                <td>{{ genderMap[item.gender_id] || '-' }}</td>
                <td>
                  <span class="badge" :class="item.is_active ? 'badge-success' : 'badge-muted'">
                    {{ item.is_active ? 'ใช้งาน' : 'ปิดใช้งาน' }}
                  </span>
                </td>
                <td class="actions-col">
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
          <button class="btn-secondary" :disabled="currentPage <= 1 || isLoading" @click="load(currentPage - 1)">
            ก่อนหน้า
          </button>
          <span>หน้า {{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-secondary" :disabled="currentPage >= totalPages || isLoading" @click="load(currentPage + 1)">
            ถัดไป
          </button>
        </div>
      </div>
    </div>

    <div v-if="isDeleteModalOpen" class="confirm-modal-overlay" @click="closeDeleteModal">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal-title">ยืนยันการลบข้อมูล</h3>
        <p class="confirm-modal-text">คุณต้องการลบข้อมูลคำนำหน้านี้ใช่หรือไม่?</p>
        <div class="confirm-modal-actions">
          <button class="btn-secondary" @click="closeDeleteModal">ยกเลิก</button>
          <button class="btn-danger" @click="confirmDelete">ลบข้อมูล</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.content-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.card-section {
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.form-group input,
.form-group select {
  height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.checkbox-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: #334155;
}

.form-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.btn-submit,
.btn-secondary {
  height: 40px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
}

.btn-submit {
  color: #fff;
  background: #4f46e5;
}

.btn-submit:hover {
  background: #4338ca;
}

.btn-secondary {
  color: #334155;
  background: #f8fafc;
  border-color: #d1d5db;
}

.btn-secondary:hover {
  background: #f1f5f9;
}

.btn-submit:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  border-top: 1px solid #e2e8f0;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 14px;
  color: #334155;
}

.data-table th {
  background: #f8fafc;
  font-weight: 700;
}

.empty-cell {
  text-align: center !important;
  color: #64748b !important;
}

.actions-col {
  width: 160px;
  text-align: center !important;
}

.action-link {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  font-weight: 600;
  cursor: pointer;
  margin-right: 8px;
  text-decoration: none;
}

.action-edit { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.action-delete { color: #dc2626; background: #fef2f2; border-color: #fecaca; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge-success {
  color: #166534;
  background: #dcfce7;
}

.badge-muted {
  color: #475569;
  background: #e2e8f0;
}

.pagination-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  color: #334155;
  font-size: 14px;
}

.page-size-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
}

.page-size-control select {
  height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 8px;
  background: #fff;
}

.loading-container {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
}

.loading-spinner {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  border-top-color: #4f46e5;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.toast-notification {
  position: fixed;
  top: 88px;
  right: 24px;
  z-index: 80;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
  max-width: 420px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
  font-size: 14px;
  font-weight: 600;
}

.toast-success {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.toast-error {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.toast-warning {
  background: #fffbeb;
  border-color: #fcd34d;
  color: #92400e;
}

.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.2s ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.confirm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
}

.confirm-modal {
  width: min(92vw, 420px);
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22);
}

.confirm-modal-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.confirm-modal-text {
  margin: 0;
  color: #475569;
  font-size: 14px;
}

.confirm-modal-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-danger {
  height: 40px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  color: #fff;
  background: #dc2626;
}

.btn-danger:hover {
  background: #b91c1c;
}
</style>
