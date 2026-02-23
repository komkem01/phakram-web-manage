<script setup lang="ts">
import type { PromotionPayload } from '~/types/settings'
import { useSystemPromotions } from '~/composables/useSystemPromotions'
import { useSystemPromotionReports } from '~/composables/useSystemPromotionReports'

definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, successMessage, promotions, paginate, fetchPromotions, createPromotion, updatePromotion, deletePromotion } = useSystemPromotions()
const {
  isLoading: isReportLoading,
  errorMessage: reportErrorMessage,
  summary: reportSummary,
  usages: reportUsages,
  paginate: reportPaginate,
  fetchSummary,
  fetchUsages
} = useSystemPromotionReports()

const form = reactive({
  code: '',
  name: '',
  description: '',
  discount_type: 'percent' as 'percent' | 'amount',
  discount_value: '',
  max_discount: '',
  min_order_amount: '0',
  usage_limit: '',
  usage_per_member: '',
  starts_at: '',
  ends_at: '',
  is_active: true
})

const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]
const reportCurrentPage = ref(1)
const reportPageSize = ref(10)
const reportSearch = ref('')
const reportPromotionId = ref('')
const isSubmitting = ref(false)
const editingId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)
const filterIsActive = ref<'all' | 'active' | 'inactive'>('all')

const toast = reactive({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

const isEditing = computed(() => Boolean(editingId.value))
const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))
const reportTotalPages = computed(() => (!reportPaginate.value.size ? 1 : Math.max(1, Math.ceil(reportPaginate.value.total / reportPaginate.value.size))))
const reportPromotionOptions = computed(() => promotions.value.map((item) => ({ id: item.id, label: `${item.code} - ${item.name}` })))

function buildReportParams(page = 1) {
  return {
    page,
    size: reportPageSize.value,
    search: reportSearch.value.trim() || undefined,
    promotion_id: reportPromotionId.value || undefined
  }
}

async function loadReports(page = 1) {
  reportCurrentPage.value = page
  await fetchUsages(buildReportParams(page))
}

async function refreshReports() {
  await fetchSummary()
  await loadReports(reportCurrentPage.value)
}

function applyReportFilters() {
  void loadReports(1)
}

function clearReportFilters() {
  reportSearch.value = ''
  reportPromotionId.value = ''
  void loadReports(1)
}

function handleReportPageSizeChange() {
  void loadReports(1)
}

function resetForm() {
  editingId.value = null
  form.code = ''
  form.name = ''
  form.description = ''
  form.discount_type = 'percent'
  form.discount_value = ''
  form.max_discount = ''
  form.min_order_amount = '0'
  form.usage_limit = ''
  form.usage_per_member = ''
  form.starts_at = ''
  form.ends_at = ''
  form.is_active = true
}

function mapServerDateToInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return local.toISOString().slice(0, 16)
}

function mapInputDateToServer(value: string) {
  if (!value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseDecimalInput(value: unknown) {
  const normalized = normalizeText(value).replace(',', '.')
  if (normalized === '') return Number.NaN
  return Number(normalized)
}

function parseOptionalIntegerInput(value: unknown) {
  const normalized = normalizeText(value)
  if (normalized === '') return null
  const parsed = Number(normalized)
  if (Number.isNaN(parsed) || !Number.isInteger(parsed)) return Number.NaN
  return parsed
}

function startEditRow(id: string) {
  const item = promotions.value.find((promotion) => promotion.id === id)
  if (!item) return

  editingId.value = item.id
  form.code = item.code || ''
  form.name = item.name || ''
  form.description = item.description || ''
  form.discount_type = item.discount_type === 'amount' ? 'amount' : 'percent'
  form.discount_value = String(item.discount_value ?? '')
  form.max_discount = item.max_discount == null ? '' : String(item.max_discount)
  form.min_order_amount = String(item.min_order_amount ?? 0)
  form.usage_limit = item.usage_limit == null ? '' : String(item.usage_limit)
  form.usage_per_member = item.usage_per_member == null ? '' : String(item.usage_per_member)
  form.starts_at = mapServerDateToInput(item.starts_at)
  form.ends_at = mapServerDateToInput(item.ends_at)
  form.is_active = Boolean(item.is_active)
}

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.type = type
  toast.message = message
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

function getActiveFilterValue() {
  if (filterIsActive.value === 'active') return true
  if (filterIsActive.value === 'inactive') return false
  return undefined
}

async function load(page = 1) {
  currentPage.value = page
  await fetchPromotions({ page, size: pageSize.value, is_active: getActiveFilterValue() })
}

function handlePageSizeChange() {
  void load(1)
}

async function handleSubmit() {
  const code = normalizeText(form.code)
  const name = normalizeText(form.name)
  const description = normalizeText(form.description)
  const maxDiscountRaw = normalizeText(form.max_discount)

  if (!code || !name || normalizeText(form.discount_value) === '') {
    showToast('warning', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
    return
  }

  const discountValue = parseDecimalInput(form.discount_value)
  const minOrderAmount = parseDecimalInput(form.min_order_amount)
  const maxDiscount = maxDiscountRaw === '' ? null : parseDecimalInput(form.max_discount)
  const usageLimit = parseOptionalIntegerInput(form.usage_limit)
  const usagePerMember = parseOptionalIntegerInput(form.usage_per_member)

  if (Number.isNaN(discountValue) || discountValue <= 0) {
    showToast('warning', 'ส่วนลดต้องมากกว่า 0')
    return
  }

  if (Number.isNaN(minOrderAmount) || minOrderAmount < 0) {
    showToast('warning', 'ยอดสั่งซื้อขั้นต่ำไม่ถูกต้อง')
    return
  }

  if (maxDiscount !== null && (Number.isNaN(maxDiscount) || maxDiscount < 0)) {
    showToast('warning', 'ส่วนลดสูงสุดไม่ถูกต้อง')
    return
  }

  if (usageLimit !== null && (Number.isNaN(usageLimit) || usageLimit < 0)) {
    showToast('warning', 'จำนวนสิทธิ์รวมไม่ถูกต้อง')
    return
  }

  if (usagePerMember !== null && (Number.isNaN(usagePerMember) || usagePerMember < 0)) {
    showToast('warning', 'จำนวนสิทธิ์ต่อสมาชิกไม่ถูกต้อง')
    return
  }

  isSubmitting.value = true
  try {
    const payload: PromotionPayload = {
      code,
      name,
      description,
      discount_type: form.discount_type,
      discount_value: discountValue,
      max_discount: maxDiscount,
      min_order_amount: minOrderAmount,
      usage_limit: usageLimit,
      usage_per_member: usagePerMember,
      starts_at: mapInputDateToServer(form.starts_at),
      ends_at: mapInputDateToServer(form.ends_at),
      is_active: form.is_active
    }

    const success = editingId.value
      ? await updatePromotion(editingId.value, payload)
      : await createPromotion(payload)

    if (!success) return

    resetForm()
    await load(currentPage.value)
    await refreshReports()
  } catch {
    showToast('error', 'บันทึกโปรโมชั่นไม่สำเร็จ')
  } finally {
    isSubmitting.value = false
  }
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
  const success = await deletePromotion(id)
  if (!success) return

  if (promotions.value.length === 1 && currentPage.value > 1) {
    await load(currentPage.value - 1)
    await refreshReports()
    return
  }

  await load(currentPage.value)
  await refreshReports()
}

async function confirmDelete() {
  if (!pendingDeleteId.value) return
  const deleteId = pendingDeleteId.value
  closeDeleteModal()
  await handleDelete(deleteId)
}

function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function formatCurrency(value?: number | null) {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('th-TH')
}

watch(successMessage, (value) => {
  if (value) showToast('success', value)
})

watch(errorMessage, (value) => {
  if (value) showToast('error', value)
})

watch(reportErrorMessage, (value) => {
  if (value) showToast('error', value)
})

watch(filterIsActive, async () => {
  await load(1)
})

onMounted(async () => {
  await load(1)
  await fetchSummary()
  await loadReports(1)
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`">
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <div class="page-header">
      <h1 class="page-title">ตั้งค่าพื้นฐาน - โปรโมชั่น</h1>
      <p class="page-subtitle">จัดการคูปองและโค้ดโปรโมชั่นสำหรับลูกค้า</p>
    </div>

    <div class="content-card">
      <form class="card-section" novalidate @submit.prevent="handleSubmit">
        <h3 class="section-title">{{ isEditing ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่น' }}</h3>

        <div class="form-grid">
          <div class="form-group">
            <label for="code">โค้ดโปรโมชั่น</label>
            <input id="code" v-model="form.code" type="text" :disabled="isSubmitting">
          </div>

          <div class="form-group">
            <label for="name">ชื่อโปรโมชั่น</label>
            <input id="name" v-model="form.name" type="text" :disabled="isSubmitting">
          </div>

          <div class="form-group full-width">
            <label for="description">รายละเอียด</label>
            <textarea id="description" v-model="form.description" rows="3" :disabled="isSubmitting"></textarea>
          </div>

          <div class="form-group">
            <label for="discount_type">ประเภทส่วนลด</label>
            <select id="discount_type" v-model="form.discount_type" :disabled="isSubmitting">
              <option value="percent">เปอร์เซ็นต์</option>
              <option value="amount">จำนวนเงิน</option>
            </select>
          </div>

          <div class="form-group">
            <label for="discount_value">ค่าส่วนลด</label>
            <input id="discount_value" v-model="form.discount_value" type="number" step="0.01" min="0" :disabled="isSubmitting">
          </div>

          <div class="form-group">
            <label for="max_discount">ส่วนลดสูงสุด (ไม่บังคับ)</label>
            <input id="max_discount" v-model="form.max_discount" type="number" step="0.01" min="0" :disabled="isSubmitting">
          </div>

          <div class="form-group">
            <label for="min_order_amount">ยอดขั้นต่ำ</label>
            <input id="min_order_amount" v-model="form.min_order_amount" type="number" step="0.01" min="0" :disabled="isSubmitting">
          </div>

          <div class="form-group">
            <label for="usage_limit">สิทธิ์รวม (ไม่บังคับ)</label>
            <input id="usage_limit" v-model="form.usage_limit" type="number" min="0" :disabled="isSubmitting">
          </div>

          <div class="form-group">
            <label for="usage_per_member">สิทธิ์ต่อสมาชิก (ไม่บังคับ)</label>
            <input id="usage_per_member" v-model="form.usage_per_member" type="number" min="0" :disabled="isSubmitting">
          </div>

          <div class="form-group">
            <label for="starts_at">เริ่มใช้งาน</label>
            <input id="starts_at" v-model="form.starts_at" type="datetime-local" :disabled="isSubmitting">
          </div>

          <div class="form-group">
            <label for="ends_at">สิ้นสุด</label>
            <input id="ends_at" v-model="form.ends_at" type="datetime-local" :disabled="isSubmitting">
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="form.is_active" type="checkbox" :disabled="isSubmitting">
              <span>เปิดใช้งานโปรโมชั่น</span>
            </label>
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
          <h3 class="section-title">รายการโปรโมชั่น</h3>

          <div class="table-tools">
            <select v-model="filterIsActive" :disabled="isLoading">
              <option value="all">ทั้งหมด</option>
              <option value="active">เฉพาะที่เปิดใช้งาน</option>
              <option value="inactive">เฉพาะที่ปิดใช้งาน</option>
            </select>

            <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">รีเฟรช</button>
          </div>
        </div>

        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>โค้ด</th>
                <th>ชื่อ</th>
                <th>ประเภท</th>
                <th>ส่วนลด</th>
                <th>ใช้งานแล้ว</th>
                <th>สถานะ</th>
                <th class="actions-col">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="promotions.length === 0">
                <td colspan="7" class="empty-cell">ไม่พบข้อมูล</td>
              </tr>
              <tr v-for="item in promotions" :key="item.id">
                <td>{{ item.code }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.discount_type === 'percent' ? 'เปอร์เซ็นต์' : 'จำนวนเงิน' }}</td>
                <td>{{ item.discount_value }}</td>
                <td>{{ item.used_count }} / {{ formatValue(item.usage_limit) }}</td>
                <td>
                  <span class="status-badge" :class="item.is_active ? 'status-active' : 'status-inactive'">
                    {{ item.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
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

          <button class="btn-secondary" :disabled="currentPage <= 1 || isLoading" @click="load(currentPage - 1)">ก่อนหน้า</button>
          <span>หน้า {{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-secondary" :disabled="currentPage >= totalPages || isLoading" @click="load(currentPage + 1)">ถัดไป</button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายงานการใช้งานโปรโมชั่น</h3>

          <div class="table-tools">
            <button class="btn-secondary" :disabled="isReportLoading" @click="refreshReports">รีเฟรชรายงาน</button>
          </div>
        </div>

        <div class="report-summary-grid">
          <div class="report-summary-card">
            <span class="report-summary-label">โปรโมชั่นทั้งหมด</span>
            <strong class="report-summary-value">{{ reportSummary.total_promotions }}</strong>
          </div>
          <div class="report-summary-card">
            <span class="report-summary-label">ที่เปิดใช้งาน</span>
            <strong class="report-summary-value">{{ reportSummary.active_promotions }}</strong>
          </div>
          <div class="report-summary-card">
            <span class="report-summary-label">คูปองที่เก็บแล้ว</span>
            <strong class="report-summary-value">{{ reportSummary.collected_coupons }}</strong>
          </div>
          <div class="report-summary-card">
            <span class="report-summary-label">คูปองที่ใช้แล้ว</span>
            <strong class="report-summary-value">{{ reportSummary.used_coupons }}</strong>
          </div>
          <div class="report-summary-card full-width">
            <span class="report-summary-label">มูลค่าส่วนลดรวม</span>
            <strong class="report-summary-value">{{ formatCurrency(reportSummary.total_discount_amount) }} บาท</strong>
          </div>
        </div>

        <div class="report-filters">
          <input
            v-model="reportSearch"
            type="text"
            placeholder="ค้นหาโค้ด / ชื่อโปรโมชั่น / เลขสมาชิก"
            :disabled="isReportLoading"
            @keyup.enter="applyReportFilters"
          >
          <select v-model="reportPromotionId" :disabled="isReportLoading">
            <option value="">ทุกโปรโมชั่น</option>
            <option v-for="item in reportPromotionOptions" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
          <button class="btn-secondary" :disabled="isReportLoading" @click="applyReportFilters">ค้นหา</button>
          <button class="btn-secondary" :disabled="isReportLoading" @click="clearReportFilters">ล้าง</button>
        </div>

        <div v-if="isReportLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>กำลังโหลดรายงาน...</p>
        </div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>เวลาใช้งาน</th>
                <th>โค้ด</th>
                <th>ชื่อโปรโมชั่น</th>
                <th>สมาชิก</th>
                <th>เลขคำสั่งซื้อ</th>
                <th>ส่วนลด</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="reportUsages.length === 0">
                <td colspan="6" class="empty-cell">ไม่พบประวัติการใช้งาน</td>
              </tr>
              <tr v-for="item in reportUsages" :key="item.id">
                <td>{{ formatDateTime(item.used_at) }}</td>
                <td>{{ item.promotion_code }}</td>
                <td>{{ item.promotion_name }}</td>
                <td>{{ item.member_no }} {{ item.member_name }}</td>
                <td>{{ item.order_no || '-' }}</td>
                <td>{{ formatCurrency(item.discount_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-row">
          <label class="page-size-control">
            แสดง
            <select v-model.number="reportPageSize" :disabled="isReportLoading" @change="handleReportPageSizeChange">
              <option v-for="size in pageSizeOptions" :key="`report-size-${size}`" :value="size">{{ size }}</option>
            </select>
            รายการ
          </label>

          <button class="btn-secondary" :disabled="reportCurrentPage <= 1 || isReportLoading" @click="loadReports(reportCurrentPage - 1)">ก่อนหน้า</button>
          <span>หน้า {{ reportCurrentPage }} / {{ reportTotalPages }}</span>
          <button class="btn-secondary" :disabled="reportCurrentPage >= reportTotalPages || isReportLoading" @click="loadReports(reportCurrentPage + 1)">ถัดไป</button>
        </div>
      </div>
    </div>

    <div v-if="isDeleteModalOpen" class="confirm-modal-overlay" @click="closeDeleteModal">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal-title">ยืนยันการลบข้อมูล</h3>
        <p class="confirm-modal-text">คุณต้องการลบข้อมูลโปรโมชั่นนี้ใช่หรือไม่?</p>
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
.section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group input, .form-group select, .form-group textarea { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font-size: 14px; outline: none; }
.form-group input, .form-group select { height: 42px; }
.checkbox-group { justify-content: flex-end; }
.checkbox-label { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #334155; }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-submit, .btn-secondary { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; }
.btn-submit { color: #fff; background: #4f46e5; }
.btn-secondary { color: #334155; background: #f8fafc; border-color: #d1d5db; }
.divider { border-top: 1px solid #e2e8f0; }
.table-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.table-tools { display: inline-flex; align-items: center; gap: 10px; }
.table-tools select { height: 36px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 10px; background: #fff; }
.report-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.report-summary-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #fff; }
.report-summary-card.full-width { grid-column: 1 / -1; }
.report-summary-label { font-size: 12px; color: #64748b; }
.report-summary-value { font-size: 20px; color: #1e293b; }
.report-filters { margin-bottom: 14px; display: grid; grid-template-columns: 2fr 1fr auto auto; gap: 10px; }
.report-filters input, .report-filters select { height: 38px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 10px; background: #fff; }
.table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; white-space: nowrap; }
.empty-cell { text-align: center !important; color: #64748b !important; }
.actions-col { width: 170px; text-align: center !important; }
.action-link { display: inline-flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; font-weight: 600; cursor: pointer; margin-right: 8px; }
.action-edit { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.action-delete { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.status-active { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.status-inactive { background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; }
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

@media (max-width: 860px) {
  .form-grid { grid-template-columns: 1fr; }
  .table-header { flex-direction: column; align-items: stretch; }
  .table-tools { justify-content: space-between; }
  .report-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .report-filters { grid-template-columns: 1fr; }
}
</style>
