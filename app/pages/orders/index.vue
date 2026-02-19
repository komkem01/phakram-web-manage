<script setup lang="ts">
import type { OrderStatus } from '~/types/settings'
import type { SystemOrderQuickQueueCounts } from '~/composables/useSystemOrders'

definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, orders, paginate, fetchOrders, fetchQuickQueueCounts } = useSystemOrders()
const { toShortCode } = useShortCode()

const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

const searchKeyword = ref('')
const memberIdFilter = ref('')
const statusFilter = ref<OrderStatus | ''>('')
const startDate = ref('')
const endDate = ref('')
const quickQueue = ref<'all' | 'waiting-review' | 'waiting-repay' | 'ready-ship' | 'refund-requested' | 'shipping' | 'completed' | 'cancelled'>('all')

const toast = reactive({ show: false, type: 'error' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions: Array<{ label: string, value: OrderStatus }> = [
  { label: 'รอดำเนินการ', value: 'pending' },
  { label: 'ชำระเงินแล้ว', value: 'paid' },
  { label: 'รอพิจารณาคืนเงิน', value: 'refund_requested' },
  { label: 'กำลังจัดส่ง', value: 'shipping' },
  { label: 'สำเร็จ', value: 'completed' },
  { label: 'ยกเลิก', value: 'cancelled' }
]

const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))

const quickQueueCounts = ref<SystemOrderQuickQueueCounts>({
  waitingReview: 0,
  waitingRepay: 0,
  readyShip: 0,
  refundRequested: 0,
  shipping: 0,
  completed: 0,
  cancelled: 0,
  all: 0
})

const displayedOrders = computed(() => {
  if (quickQueue.value === 'waiting-review') {
    return orders.value.filter(item => item.status === 'pending' && Boolean(item.payment_submitted))
  }
  if (quickQueue.value === 'waiting-repay') {
    return orders.value.filter(item => item.status === 'pending' && Boolean(item.payment_rejected) && !Boolean(item.payment_submitted))
  }
  if (quickQueue.value === 'ready-ship') {
    return orders.value.filter(item => item.status === 'paid')
  }
  if (quickQueue.value === 'refund-requested') {
    return orders.value.filter(item => item.status === 'refund_requested')
  }
  if (quickQueue.value === 'shipping') {
    return orders.value.filter(item => item.status === 'shipping')
  }
  if (quickQueue.value === 'completed') {
    return orders.value.filter(item => item.status === 'completed')
  }
  if (quickQueue.value === 'cancelled') {
    return orders.value.filter(item => item.status === 'cancelled')
  }
  return orders.value
})

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.type = type
  toast.message = message
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('th-TH')
}

function formatMoney(value: string | number) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusLabel(status?: string) {
  switch (status) {
    case 'pending': return 'รอดำเนินการ'
    case 'paid': return 'ชำระเงินแล้ว'
    case 'refund_requested': return 'รอพิจารณาคืนเงิน'
    case 'shipping': return 'กำลังจัดส่ง'
    case 'completed': return 'สำเร็จ'
    case 'cancelled': return 'ยกเลิก'
    default: return status || '-'
  }
}

function isWaitingCustomerRepay(item: { status?: string, payment_rejected?: boolean, payment_submitted?: boolean }) {
  return item.status === 'pending' && Boolean(item.payment_rejected) && !Boolean(item.payment_submitted)
}

function orderReference(orderNo?: string, id?: string) {
  if (orderNo) return orderNo
  return toShortCode(id, 'ORD')
}

function toUnixStartOfDay(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return Math.floor(date.getTime() / 1000)
}

function toUnixEndOfDay(dateText: string) {
  const date = new Date(`${dateText}T23:59:59`)
  if (Number.isNaN(date.getTime())) return undefined
  return Math.floor(date.getTime() / 1000)
}

async function load(page = 1) {
  currentPage.value = page

  const params: Record<string, unknown> = {
    page,
    size: pageSize.value,
    sort_by: 'created_at',
    order_by: 'desc'
  }

  if (searchKeyword.value.trim()) params.search = searchKeyword.value.trim()
  if (memberIdFilter.value.trim()) params.member_id = memberIdFilter.value.trim()
  if (statusFilter.value) params.status = statusFilter.value

  const start = startDate.value ? toUnixStartOfDay(startDate.value) : undefined
  const end = endDate.value ? toUnixEndOfDay(endDate.value) : undefined
  if (start) params.start_date = start
  if (end) params.end_date = end

  await fetchOrders(params)

  const countParams: Record<string, unknown> = {}
  if (searchKeyword.value.trim()) countParams.search = searchKeyword.value.trim()
  if (memberIdFilter.value.trim()) countParams.member_id = memberIdFilter.value.trim()
  if (statusFilter.value) countParams.status = statusFilter.value
  if (start) countParams.start_date = start
  if (end) countParams.end_date = end

  quickQueueCounts.value = await fetchQuickQueueCounts(countParams)
}

function handleSearch() {
  void load(1)
}

function clearFilters() {
  searchKeyword.value = ''
  memberIdFilter.value = ''
  statusFilter.value = ''
  startDate.value = ''
  endDate.value = ''
  quickQueue.value = 'all'
  void load(1)
}

function setQuickQueue(value: 'all' | 'waiting-review' | 'waiting-repay' | 'ready-ship' | 'refund-requested' | 'shipping' | 'completed' | 'cancelled') {
  quickQueue.value = value
}

function handlePageSizeChange() {
  void load(1)
}

watch(errorMessage, (value) => {
  if (value) showToast('error', value)
})

onMounted(async () => {
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
      <h1 class="page-title">จัดการคำสั่งซื้อ</h1>
      <p class="page-subtitle">รายการคำสั่งซื้อพร้อมค้นหาและกรองข้อมูล</p>
    </div>

    <div class="content-card">
      <div class="card-section">
        <h3 class="section-title">คิวด่วน</h3>
        <div class="quick-queue-grid">
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'waiting-review' }" @click="setQuickQueue('waiting-review')">
            <p class="quick-queue-title">รอตรวจสอบ</p>
            <p class="quick-queue-count">{{ quickQueueCounts.waitingReview }}</p>
          </button>
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'waiting-repay' }" @click="setQuickQueue('waiting-repay')">
            <p class="quick-queue-title">รอลูกค้าชำระใหม่</p>
            <p class="quick-queue-count">{{ quickQueueCounts.waitingRepay }}</p>
          </button>
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'ready-ship' }" @click="setQuickQueue('ready-ship')">
            <p class="quick-queue-title">พร้อมจัดส่ง</p>
            <p class="quick-queue-count">{{ quickQueueCounts.readyShip }}</p>
          </button>
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'refund-requested' }" @click="setQuickQueue('refund-requested')">
            <p class="quick-queue-title">รอพิจารณาคืนเงิน</p>
            <p class="quick-queue-count">{{ quickQueueCounts.refundRequested }}</p>
          </button>
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'shipping' }" @click="setQuickQueue('shipping')">
            <p class="quick-queue-title">กำลังจัดส่ง</p>
            <p class="quick-queue-count">{{ quickQueueCounts.shipping }}</p>
          </button>
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'completed' }" @click="setQuickQueue('completed')">
            <p class="quick-queue-title">สำเร็จ</p>
            <p class="quick-queue-count">{{ quickQueueCounts.completed }}</p>
          </button>
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'cancelled' }" @click="setQuickQueue('cancelled')">
            <p class="quick-queue-title">ยกเลิก</p>
            <p class="quick-queue-count">{{ quickQueueCounts.cancelled }}</p>
          </button>
          <button class="quick-queue-card" :class="{ 'quick-queue-card-active': quickQueue === 'all' }" @click="setQuickQueue('all')">
            <p class="quick-queue-title">ทั้งหมด</p>
            <p class="quick-queue-count">{{ quickQueueCounts.all }}</p>
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="card-section">
        <h3 class="section-title">ตัวกรอง</h3>
        <div class="filter-grid">
          <div class="form-group">
            <label>ค้นหารหัสคำสั่งซื้อ</label>
            <input v-model="searchKeyword" type="text" placeholder="เช่น ORD-000123" @keyup.enter="handleSearch">
          </div>
          <div class="form-group">
            <label>ค้นหารหัสสมาชิก</label>
            <input v-model="memberIdFilter" type="text" placeholder="กรอกรหัสสมาชิก" @keyup.enter="handleSearch">
          </div>
          <div class="form-group">
            <label>สถานะ</label>
            <select v-model="statusFilter">
              <option value="">ทั้งหมด</option>
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>วันที่เริ่มต้น</label>
            <input v-model="startDate" type="date">
          </div>
          <div class="form-group">
            <label>วันที่สิ้นสุด</label>
            <input v-model="endDate" type="date">
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-submit" :disabled="isLoading" @click="handleSearch">ค้นหา</button>
          <button class="btn-secondary" :disabled="isLoading" @click="clearFilters">ล้างตัวกรอง</button>
          <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">รีเฟรช</button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการคำสั่งซื้อ</h3>
        </div>

        <div v-if="isLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูล...</p></div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>รหัสคำสั่งซื้อ</th>
                <th>รหัสสมาชิก</th>
                <th>สถานะ</th>
                <th>ยอดรวมสุทธิ</th>
                <th>สร้างเมื่อ</th>
                <th class="actions-col">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="displayedOrders.length === 0"><td colspan="6" class="empty-cell">ไม่พบข้อมูล</td></tr>
              <tr v-for="item in displayedOrders" :key="item.id">
                <td>{{ orderReference(item.order_no, item.id) }}</td>
                <td>{{ toShortCode(item.member_id, 'MEM') }}</td>
                <td>
                  <span class="badge" :class="`badge-${item.status}`">{{ item.status_summary || statusLabel(item.status) }}</span>
                  <span v-if="isWaitingCustomerRepay(item)" class="badge badge-waiting-repay">รอลูกค้าชำระใหม่</span>
                  <p v-if="item.status_next_step" class="status-next-step">{{ item.status_next_step }}</p>
                </td>
                <td>{{ formatMoney(item.net_amount) }}</td>
                <td>{{ formatDateTime(item.created_at) }}</td>
                <td class="actions-col">
                  <NuxtLink class="action-link action-detail" :to="`/orders/${item.id}`">ดูรายละเอียด</NuxtLink>
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
.quick-queue-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 1024px) { .quick-queue-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .quick-queue-grid { grid-template-columns: 1fr; } }
.quick-queue-card { text-align: left; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #fff; cursor: pointer; }
.quick-queue-card-active { border-color: #818cf8; background: #eef2ff; }
.quick-queue-title { margin: 0; font-size: 13px; color: #475569; font-weight: 600; }
.quick-queue-count { margin: 6px 0 0 0; font-size: 22px; color: #1e293b; font-weight: 700; }
.filter-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 1024px) { .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) { .filter-grid { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 600; color: #334155; }
.form-group input,.form-group select { height: 42px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 12px; font-size: 14px; outline: none; }
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
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge-pending { color: #92400e; background: #fffbeb; }
.badge-paid { color: #166534; background: #dcfce7; }
.badge-refund_requested { color: #9a3412; background: #ffedd5; }
.badge-shipping { color: #1d4ed8; background: #dbeafe; }
.badge-completed { color: #0f766e; background: #ccfbf1; }
.badge-cancelled { color: #991b1b; background: #fee2e2; }
.badge-waiting-repay { color: #b45309; background: #fef3c7; margin-left: 6px; }
.status-next-step { margin: 6px 0 0 0; font-size: 12px; color: #64748b; }
.action-link { display: inline-flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; font-weight: 600; cursor: pointer; margin-right: 8px; text-decoration: none; }
.action-detail { color: #1d4ed8; background: #eff6ff; border-color: #bfdbfe; }
.pagination-row { margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; color: #334155; font-size: 14px; }
.page-size-control { display: inline-flex; align-items: center; gap: 8px; margin-right: 8px; }
.page-size-control select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }
.loading-container { display: flex; align-items: center; gap: 10px; color: #64748b; }
.loading-spinner { width: 22px; height: 22px; border-radius: 999px; border: 2px solid #cbd5e1; border-top-color: #4f46e5; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-notification { position: fixed; top: 88px; right: 24px; z-index: 80; min-width: 240px; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,0.15); background: #fff; }
.toast-error { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
.toast-success { background: #f0fdf4; color: #166534; border-color: #86efac; }
.toast-warning { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
</style>
