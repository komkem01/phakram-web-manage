<script setup lang="ts">
import type { SystemPaymentPayload } from '~/types/settings'
import { useSystemPayments } from '~/composables/useSystemPayments'

definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, successMessage, payments, paginate, fetchPayments, createPayment, updatePayment, deletePayment } = useSystemPayments()
const { toShortCode } = useShortCode()

const form = reactive<SystemPaymentPayload>({ amount: '', status: 'pending' })
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const isSubmitting = ref(false)
const editingId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

const statusOptions = ['pending', 'success', 'failed', 'refunded'] as const

const toast = reactive({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

const isEditing = computed(() => Boolean(editingId.value))
const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))

function resetForm() {
  editingId.value = null
  form.amount = ''
  form.status = 'pending'
}

function startEditRow(id: string) {
  const item = payments.value.find((payment) => payment.id === id)
  if (!item) return

  editingId.value = item.id
  form.amount = String(item.amount)
  form.status = (item.status as SystemPaymentPayload['status']) || 'pending'
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
  await fetchPayments({ page, size: pageSize.value, sort_by: 'id', order_by: 'desc' })
}

function handlePageSizeChange() {
  void load(1)
}

async function handleSubmit() {
  if (!form.amount.trim()) {
    showToast('warning', 'กรุณากรอกจำนวนเงินให้ครบถ้วน')
    return
  }

  isSubmitting.value = true
  const payload: SystemPaymentPayload = {
    amount: form.amount.trim(),
    status: form.status
  }
  const success = editingId.value ? await updatePayment(editingId.value, payload) : await createPayment(payload)
  isSubmitting.value = false
  if (!success) return
  resetForm()
  await load(currentPage.value)
}

function openDeleteModal(id: string) { pendingDeleteId.value = id; isDeleteModalOpen.value = true }
function closeDeleteModal() { isDeleteModalOpen.value = false; pendingDeleteId.value = null }

async function handleDelete(id: string) {
  const success = await deletePayment(id)
  if (!success) return
  if (payments.value.length === 1 && currentPage.value > 1) {
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
  await load(1)
})

onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`">
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <div class="page-header">
      <h1 class="page-title">ตั้งค่าพื้นฐาน - Payment</h1>
      <p class="page-subtitle">จัดการรายการ payment สำหรับระบบ</p>
    </div>

    <div class="content-card">
      <form class="card-section" @submit.prevent="handleSubmit">
        <h3 class="section-title">{{ isEditing ? 'แก้ไข Payment' : 'เพิ่ม Payment' }}</h3>

        <div class="form-grid">
          <div class="form-group">
            <label for="amount">จำนวนเงิน</label>
            <input id="amount" v-model="form.amount" type="number" step="0.01" min="0" :disabled="isSubmitting" required>
          </div>
          <div class="form-group">
            <label for="status">สถานะ</label>
            <select id="status" v-model="form.status" :disabled="isSubmitting">
              <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-submit" :disabled="isSubmitting">{{ isEditing ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล' }}</button>
          <button v-if="isEditing" type="button" class="btn-secondary" :disabled="isSubmitting" @click="resetForm">ยกเลิก</button>
        </div>
      </form>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการ Payment</h3>
          <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">รีเฟรช</button>
        </div>

        <div v-if="isLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูล...</p></div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>รหัสอ้างอิง</th><th>Amount</th><th>Status</th><th class="actions-col">จัดการ</th></tr></thead>
            <tbody>
              <tr v-if="payments.length === 0"><td colspan="4" class="empty-cell">ไม่พบข้อมูล</td></tr>
              <tr v-for="item in payments" :key="item.id">
                <td>{{ toShortCode(item.id, 'PAY') }}</td>
                <td>{{ item.amount }}</td>
                <td>{{ item.status }}</td>
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
          <button class="btn-secondary" :disabled="currentPage <= 1 || isLoading" @click="load(currentPage - 1)">ก่อนหน้า</button>
          <span>หน้า {{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-secondary" :disabled="currentPage >= totalPages || isLoading" @click="load(currentPage + 1)">ถัดไป</button>
        </div>
      </div>
    </div>

    <div v-if="isDeleteModalOpen" class="confirm-modal-overlay" @click="closeDeleteModal">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal-title">ยืนยันการลบข้อมูล</h3>
        <p class="confirm-modal-text">คุณต้องการลบข้อมูล payment นี้ใช่หรือไม่?</p>
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
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group input,.form-group select { height: 42px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 12px; font-size: 14px; outline: none; }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-submit,.btn-secondary { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; }
.btn-submit { color: #fff; background: #4f46e5; }
.btn-secondary { color: #334155; background: #f8fafc; border-color: #d1d5db; }
.divider { border-top: 1px solid #e2e8f0; }
.table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th,.data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; }
.actions-col { width: 160px; text-align: center !important; }
.action-link { display: inline-flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; font-weight: 600; cursor: pointer; margin-right: 8px; }
.action-edit { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.action-delete { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.pagination-row { margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; color: #334155; font-size: 14px; }
.page-size-control { display: inline-flex; align-items: center; gap: 8px; margin-right: 8px; }
.page-size-control select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }
.loading-container { display: flex; align-items: center; gap: 10px; color: #64748b; }
.loading-spinner { width: 22px; height: 22px; border-radius: 999px; border: 2px solid #cbd5e1; border-top-color: #4f46e5; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-notification { position: fixed; top: 88px; right: 24px; z-index: 80; min-width: 280px; max-width: 420px; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15); font-size: 14px; font-weight: 600; }
.confirm-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 90; }
.confirm-modal { width: min(92vw, 420px); background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22); }
.confirm-modal-actions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
.btn-danger { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; color: #fff; background: #dc2626; }
.btn-danger:hover { background: #b91c1c; }
</style>
