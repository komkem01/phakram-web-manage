<script setup lang="ts">
import type { SystemBankAccountPayload } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, successMessage, bankAccounts, paginate, fetchSystemBankAccounts, createSystemBankAccount, updateSystemBankAccount, deleteSystemBankAccount } = useSystemBankAccounts()
const { banks, fetchBanks } = useSystemBanks()

const form = reactive<SystemBankAccountPayload>({
  bank_id: '',
  account_name: '',
  account_no: '',
  branch: '',
  is_active: true,
  is_default_receive: false,
  is_default_refund: false
})

const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const isSubmitting = ref(false)
const editingId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

const toast = reactive({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

const isEditing = computed(() => Boolean(editingId.value))
const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))

function resetForm() {
  editingId.value = null
  form.bank_id = ''
  form.account_name = ''
  form.account_no = ''
  form.branch = ''
  form.is_active = true
  form.is_default_receive = false
  form.is_default_refund = false
}

function startEditRow(id: string) {
  const item = bankAccounts.value.find((entry) => entry.id === id)
  if (!item) return

  editingId.value = item.id
  form.bank_id = item.bank_id
  form.account_name = item.account_name
  form.account_no = item.account_no
  form.branch = item.branch || ''
  form.is_active = item.is_active
  form.is_default_receive = item.is_default_receive
  form.is_default_refund = item.is_default_refund
}

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.type = type
  toast.message = message
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

function bankDisplayName(id: string) {
  const item = banks.value.find((entry) => entry.id === id)
  if (!item) return '-'
  return item.name_th || item.name_en || '-'
}

async function load(page = 1) {
  currentPage.value = page
  await fetchSystemBankAccounts({ page, size: pageSize.value, sort_by: 'created_at', order_by: 'desc' })
}

function handlePageSizeChange() {
  void load(1)
}

async function handleSubmit() {
  if (!form.bank_id || !form.account_name.trim() || !form.account_no.trim()) {
    showToast('warning', 'กรุณากรอกข้อมูลให้ครบถ้วน')
    return
  }

  isSubmitting.value = true
  const payload: SystemBankAccountPayload = {
    bank_id: form.bank_id,
    account_name: form.account_name.trim(),
    account_no: form.account_no.trim(),
    branch: form.branch.trim(),
    is_active: form.is_active,
    is_default_receive: form.is_default_receive,
    is_default_refund: form.is_default_refund
  }

  const success = editingId.value ? await updateSystemBankAccount(editingId.value, payload) : await createSystemBankAccount(payload)
  isSubmitting.value = false
  if (!success) return
  resetForm()
  await load(currentPage.value)
}

function openDeleteModal(id: string) { pendingDeleteId.value = id; isDeleteModalOpen.value = true }
function closeDeleteModal() { isDeleteModalOpen.value = false; pendingDeleteId.value = null }

async function handleDelete(id: string) {
  const success = await deleteSystemBankAccount(id)
  if (!success) return
  if (bankAccounts.value.length === 1 && currentPage.value > 1) {
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
  await fetchBanks({ page: 1, size: 200, sort_by: 'name_th', order_by: 'asc' })
  await load(1)
})

onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`"><span>{{ toast.message }}</span></div>
    </transition>

    <div class="page-header">
      <h1 class="page-title">ตั้งค่าพื้นฐาน - บัญชีธนาคารระบบ</h1>
      <p class="page-subtitle">จัดการบัญชีรับเงินและคืนเงินของระบบ</p>
    </div>

    <div class="content-card">
      <form class="card-section" @submit.prevent="handleSubmit">
        <h3 class="section-title">{{ isEditing ? 'แก้ไขบัญชีระบบ' : 'เพิ่มบัญชีระบบ' }}</h3>

        <div class="form-grid">
          <div class="form-group">
            <label for="bank_id">ธนาคาร</label>
            <select id="bank_id" v-model="form.bank_id" :disabled="isSubmitting" required>
              <option value="">เลือกธนาคาร</option>
              <option v-for="item in banks" :key="item.id" :value="item.id">{{ item.name_th || item.name_en }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="account_name">ชื่อบัญชี</label>
            <input id="account_name" v-model="form.account_name" type="text" :disabled="isSubmitting" required>
          </div>
          <div class="form-group">
            <label for="account_no">เลขบัญชี</label>
            <input id="account_no" v-model="form.account_no" type="text" :disabled="isSubmitting" required>
          </div>
          <div class="form-group">
            <label for="branch">สาขา</label>
            <input id="branch" v-model="form.branch" type="text" :disabled="isSubmitting">
          </div>
        </div>

        <div class="checkbox-row">
          <label class="checkbox-group"><input v-model="form.is_active" type="checkbox" :disabled="isSubmitting"><span>เปิดใช้งาน</span></label>
          <label class="checkbox-group"><input v-model="form.is_default_receive" type="checkbox" :disabled="isSubmitting"><span>ค่าเริ่มต้นรับเงิน</span></label>
          <label class="checkbox-group"><input v-model="form.is_default_refund" type="checkbox" :disabled="isSubmitting"><span>ค่าเริ่มต้นคืนเงิน</span></label>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-submit" :disabled="isSubmitting">{{ isEditing ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล' }}</button>
          <button v-if="isEditing" type="button" class="btn-secondary" :disabled="isSubmitting" @click="resetForm">ยกเลิก</button>
        </div>
      </form>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการบัญชีธนาคารระบบ</h3>
          <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">รีเฟรช</button>
        </div>

        <div v-if="isLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูล...</p></div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>ธนาคาร</th><th>ชื่อบัญชี</th><th>เลขบัญชี</th><th>สาขา</th><th>สถานะ</th><th>ค่าตั้งต้น</th><th class="actions-col">จัดการ</th></tr></thead>
            <tbody>
              <tr v-if="bankAccounts.length === 0"><td colspan="7" class="empty-cell">ไม่พบข้อมูล</td></tr>
              <tr v-for="item in bankAccounts" :key="item.id">
                <td>{{ item.bank_name_th || item.bank_name_en || bankDisplayName(item.bank_id) }}</td>
                <td>{{ item.account_name }}</td>
                <td>{{ item.account_no }}</td>
                <td>{{ item.branch || '-' }}</td>
                <td><span class="badge" :class="item.is_active ? 'badge-success' : 'badge-muted'">{{ item.is_active ? 'ใช้งาน' : 'ปิดใช้งาน' }}</span></td>
                <td>
                  <span v-if="item.is_default_receive" class="badge badge-default">รับเงิน</span>
                  <span v-if="item.is_default_refund" class="badge badge-default-refund">คืนเงิน</span>
                  <span v-if="!item.is_default_receive && !item.is_default_refund">-</span>
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
          <label class="page-size-control">แสดง<select v-model.number="pageSize" :disabled="isLoading" @change="handlePageSizeChange"><option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option></select>รายการ</label>
          <button class="btn-secondary" :disabled="currentPage <= 1 || isLoading" @click="load(currentPage - 1)">ก่อนหน้า</button>
          <span>หน้า {{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-secondary" :disabled="currentPage >= totalPages || isLoading" @click="load(currentPage + 1)">ถัดไป</button>
        </div>
      </div>
    </div>

    <div v-if="isDeleteModalOpen" class="confirm-modal-overlay" @click="closeDeleteModal">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal-title">ยืนยันการลบข้อมูล</h3>
        <p class="confirm-modal-text">คุณต้องการลบบัญชีธนาคารระบบนี้ใช่หรือไม่?</p>
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
.checkbox-row { margin-top: 12px; display: flex; gap: 18px; flex-wrap: wrap; }
.checkbox-group { display: inline-flex; align-items: center; gap: 8px; color: #334155; }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-submit,.btn-secondary { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; }
.btn-submit { color: #fff; background: #4f46e5; }
.btn-secondary { color: #334155; background: #f8fafc; border-color: #d1d5db; }
.divider { border-top: 1px solid #e2e8f0; }
.table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th,.data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; }
.data-table th { background: #f8fafc; font-weight: 700; }
.empty-cell { text-align: center !important; color: #64748b !important; }
.actions-col { width: 160px; text-align: center !important; }
.action-link { display: inline-flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; font-weight: 600; cursor: pointer; margin-right: 8px; text-decoration: none; }
.action-edit { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.action-delete { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge-success { color: #166534; background: #dcfce7; }
.badge-muted { color: #475569; background: #e2e8f0; }
.badge-default { color: #1d4ed8; background: #dbeafe; margin-right: 6px; }
.badge-default-refund { color: #9a3412; background: #ffedd5; }
.pagination-row { margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; color: #334155; font-size: 14px; }
.page-size-control { display: inline-flex; align-items: center; gap: 8px; margin-right: 8px; }
.page-size-control select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }
.loading-container { display: flex; align-items: center; gap: 10px; color: #64748b; }
.loading-spinner { width: 22px; height: 22px; border-radius: 999px; border: 2px solid #cbd5e1; border-top-color: #4f46e5; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-notification { position: fixed; top: 88px; right: 24px; z-index: 80; min-width: 280px; max-width: 420px; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15); font-size: 14px; font-weight: 600; }
.toast-success { background: #f0fdf4; border-color: #86efac; color: #166534; }
.toast-error { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
.toast-warning { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
.confirm-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 90; }
.confirm-modal { width: min(92vw, 420px); background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22); }
.confirm-modal-actions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
.btn-danger { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; color: #fff; background: #dc2626; }
.btn-danger:hover { background: #b91c1c; }
</style>
