<script setup lang="ts">
import type { MemberRegisterPayload, MemberUpdatePayload } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, successMessage, users, paginate, fetchUsers, createUser, updateUser, deleteUser } = useSystemUsers()
const prefixApi = useSystemPrefixes()
const genderApi = useSystemGenders()
const tierApi = useSystemTiers()
const statusApi = useSystemStatuses()

const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const editingId = ref<string | null>(null)
const isSubmitting = ref(false)
const isDeleteModalOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

const form = reactive<MemberRegisterPayload>({
  prefix_id: '',
  gender_id: '',
  firstname_th: '',
  lastname_th: '',
  firstname_en: '',
  lastname_en: '',
  role: 'customer',
  phone: '',
  email: '',
  password: '',
  tier_id: '',
  status_id: ''
})

const toast = reactive({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

const isEditing = computed(() => Boolean(editingId.value))
const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))

function formatDate(unix?: number | null) {
  if (!unix) return '-'
  const date = new Date(unix * 1000)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('th-TH')
}

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.type = type
  toast.message = message
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

function resetForm() {
  editingId.value = null
  form.prefix_id = ''
  form.gender_id = ''
  form.firstname_th = ''
  form.lastname_th = ''
  form.firstname_en = ''
  form.lastname_en = ''
  form.role = 'customer'
  form.phone = ''
  form.email = ''
  form.password = ''
  form.tier_id = ''
  form.status_id = ''
}

function startEditRow(id: string) {
  const item = users.value.find((user) => user.id === id)
  if (!item) return

  editingId.value = item.id
  form.prefix_id = item.prefix_id || ''
  form.gender_id = item.gender_id || ''
  form.firstname_th = item.firstname_th || ''
  form.lastname_th = item.lastname_th || ''
  form.firstname_en = item.firstname_en || ''
  form.lastname_en = item.lastname_en || ''
  form.role = 'customer'
  form.phone = item.phone || ''
  form.email = ''
  form.password = ''
  form.tier_id = item.tier_id || ''
  form.status_id = item.status_id || ''
}

async function load(page = 1) {
  currentPage.value = page
  await fetchUsers({ page, size: pageSize.value, role: 'customer', sort_by: 'created_at', order_by: 'desc' })
}

function handlePageSizeChange() {
  void load(1)
}

async function handleSubmit() {
  const firstnameTh = form.firstname_th.trim()
  const lastnameTh = form.lastname_th.trim()
  const firstnameEn = form.firstname_en.trim()
  const lastnameEn = form.lastname_en.trim()
  const phone = form.phone.trim()

  if (!form.prefix_id || !form.gender_id || !firstnameTh || !lastnameTh || !firstnameEn || !lastnameEn || !phone) {
    showToast('warning', 'กรุณากรอกข้อมูลให้ครบถ้วน')
    return
  }

  isSubmitting.value = true

  let success = false
  if (editingId.value) {
    const payload: MemberUpdatePayload = {
      prefix_id: form.prefix_id,
      gender_id: form.gender_id,
      firstname_th: firstnameTh,
      lastname_th: lastnameTh,
      firstname_en: firstnameEn,
      lastname_en: lastnameEn,
      role: 'customer',
      phone,
      tier_id: form.tier_id || undefined,
      status_id: form.status_id || undefined
    }
    success = await updateUser(editingId.value, payload)
  } else {
    const email = form.email.trim()
    const password = form.password.trim()
    if (!email || !password) {
      isSubmitting.value = false
      showToast('warning', 'กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    const payload: MemberRegisterPayload = {
      prefix_id: form.prefix_id,
      gender_id: form.gender_id,
      firstname_th: firstnameTh,
      lastname_th: lastnameTh,
      firstname_en: firstnameEn,
      lastname_en: lastnameEn,
      role: 'customer',
      phone,
      email,
      password,
      tier_id: form.tier_id || undefined,
      status_id: form.status_id || undefined
    }
    success = await createUser(payload)
  }

  isSubmitting.value = false
  if (!success) return
  resetForm()
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

async function confirmDelete() {
  if (!pendingDeleteId.value) return
  const deleteId = pendingDeleteId.value
  closeDeleteModal()
  const success = await deleteUser(deleteId)
  if (!success) return
  if (users.value.length === 1 && currentPage.value > 1) {
    await load(currentPage.value - 1)
    return
  }
  await load(currentPage.value)
}

watch(successMessage, (value) => { if (value) showToast('success', value) })
watch(errorMessage, (value) => { if (value) showToast('error', value) })

onMounted(async () => {
  await Promise.all([
    load(1),
    prefixApi.fetchPrefixes({ page: 1, size: 500, sort_by: 'name_th', order_by: 'asc' }),
    genderApi.fetchGenders({ page: 1, size: 500, sort_by: 'name_th', order_by: 'asc' }),
    tierApi.fetchTiers({ page: 1, size: 500, sort_by: 'name_th', order_by: 'asc' }),
    statusApi.fetchStatuses({ page: 1, size: 500, sort_by: 'name_th', order_by: 'asc' })
  ])
})

onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`"><span>{{ toast.message }}</span></div>
    </transition>

    <div class="page-header">
      <h1 class="page-title">จัดการลูกค้า</h1>
      <p class="page-subtitle">เพิ่ม/แก้ไข/ลบ ลูกค้า</p>
    </div>

    <div class="content-card">
      <form class="card-section" @submit.prevent="handleSubmit">
        <h3 class="section-title">{{ isEditing ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า' }}</h3>
        <p class="hint-text">เงื่อนไขต่างกัน: ลูกค้าสมัครเองระบบใช้ Tier/Status ค่าเริ่มต้น, แอดมินสมัครแทนลูกค้าสามารถกำหนด Tier/Status ได้ (ไม่บังคับ)</p>

        <div class="form-grid">
          <div class="form-group"><label>คำนำหน้า</label><select v-model="form.prefix_id" :disabled="isSubmitting"><option value="">เลือกคำนำหน้า</option><option v-for="item in prefixApi.prefixes.value" :key="item.id" :value="item.id">{{ item.name_th }}</option></select></div>
          <div class="form-group"><label>เพศ</label><select v-model="form.gender_id" :disabled="isSubmitting"><option value="">เลือกเพศ</option><option v-for="item in genderApi.genders.value" :key="item.id" :value="item.id">{{ item.name_th }}</option></select></div>
          <div class="form-group"><label>ชื่อ (ไทย)</label><input v-model="form.firstname_th" type="text" :disabled="isSubmitting" /></div>
          <div class="form-group"><label>นามสกุล (ไทย)</label><input v-model="form.lastname_th" type="text" :disabled="isSubmitting" /></div>
          <div class="form-group"><label>ชื่อ (อังกฤษ)</label><input v-model="form.firstname_en" type="text" :disabled="isSubmitting" /></div>
          <div class="form-group"><label>นามสกุล (อังกฤษ)</label><input v-model="form.lastname_en" type="text" :disabled="isSubmitting" /></div>
          <div class="form-group"><label>เบอร์โทร</label><input v-model="form.phone" type="text" :disabled="isSubmitting" /></div>
          <div class="form-group"><label>ระดับสมาชิก (Tier) - ไม่บังคับ</label><select v-model="form.tier_id" :disabled="isSubmitting"><option value="">ใช้ค่าเริ่มต้นระบบ</option><option v-for="item in tierApi.tiers.value" :key="item.id" :value="item.id">{{ item.name_th }}</option></select></div>
          <div class="form-group"><label>สถานะ (Status) - ไม่บังคับ</label><select v-model="form.status_id" :disabled="isSubmitting"><option value="">ใช้ค่าเริ่มต้นระบบ</option><option v-for="item in statusApi.statuses.value" :key="item.id" :value="item.id">{{ item.name_th }}</option></select></div>
          <div class="form-group" v-if="!isEditing"><label>อีเมล</label><input v-model="form.email" type="email" :disabled="isSubmitting" /></div>
          <div class="form-group" v-if="!isEditing"><label>รหัสผ่าน</label><input v-model="form.password" type="password" :disabled="isSubmitting" /></div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-submit" :disabled="isSubmitting">{{ isEditing ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล' }}</button>
          <button v-if="isEditing" type="button" class="btn-secondary" :disabled="isSubmitting" @click="resetForm">ยกเลิก</button>
        </div>
      </form>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการลูกค้า</h3>
          <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">รีเฟรช</button>
        </div>

        <div v-if="isLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูล...</p></div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>รหัสสมาชิก</th><th>ชื่อ-นามสกุล</th><th>เบอร์โทร</th><th>บทบาท</th><th>สมัครเมื่อ</th><th>เข้าสู่ระบบล่าสุด</th><th class="actions-col">จัดการ</th></tr></thead>
            <tbody>
              <tr v-if="users.length === 0"><td colspan="7" class="empty-cell">ไม่พบข้อมูล</td></tr>
              <tr v-for="item in users" :key="item.id">
                <td>{{ item.member_no || '-' }}</td>
                <td>{{ `${item.firstname_th || ''} ${item.lastname_th || ''}`.trim() || '-' }}</td>
                <td>{{ item.phone || '-' }}</td>
                <td><span class="badge badge-customer">ลูกค้า</span></td>
                <td>{{ formatDate(item.registration || item.created_at) }}</td>
                <td>{{ formatDate(item.last_login) }}</td>
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
        <h3 class="confirm-modal-title">ยืนยันการลบผู้ใช้งาน</h3>
        <p class="confirm-modal-text">คุณต้องการลบลูกค้านี้ใช่หรือไม่?</p>
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
.hint-text { margin: 0 0 12px 0; color: #0f766e; font-size: 13px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 600; color: #334155; }
.form-group input,.form-group select { height: 42px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 12px; font-size: 14px; outline: none; }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-submit,.btn-secondary,.btn-danger { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; }
.btn-submit { color: #fff; background: #4f46e5; }
.btn-secondary { color: #334155; background: #f8fafc; border-color: #d1d5db; }
.btn-danger { color: #fff; background: #dc2626; }
.divider { border-top: 1px solid #e2e8f0; }
.table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th,.data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; }
.data-table th { background: #f8fafc; font-weight: 700; }
.empty-cell { text-align: center !important; color: #64748b !important; }
.actions-col { width: 170px; text-align: center !important; }
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge-customer { color: #166534; background: #dcfce7; }
.action-link { display: inline-flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; font-weight: 600; cursor: pointer; margin-right: 8px; text-decoration: none; }
.action-edit { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.action-delete { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.pagination-row { margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; color: #334155; font-size: 14px; }
.page-size-control { display: inline-flex; align-items: center; gap: 8px; margin-right: 8px; }
.page-size-control select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }
.loading-container { display: flex; align-items: center; gap: 10px; color: #64748b; }
.loading-spinner { width: 22px; height: 22px; border-radius: 999px; border: 2px solid #cbd5e1; border-top-color: #4f46e5; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-notification { position: fixed; top: 88px; right: 24px; z-index: 80; min-width: 240px; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,0.15); background: #fff; }
.toast-success { background: #f0fdf4; color: #166534; border-color: #86efac; }
.toast-error { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
.toast-warning { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
.confirm-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 90; }
.confirm-modal { width: min(92vw, 420px); background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22); }
.confirm-modal-title { margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1e293b; }
.confirm-modal-text { margin: 0; color: #475569; font-size: 14px; }
.confirm-modal-actions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
</style>
