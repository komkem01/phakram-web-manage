<script setup lang="ts">
import type { Order, OrderPaymentDetail } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const orderId = computed(() => String(route.params.id || ''))
const { toShortCode } = useShortCode()

const { isLoading, isItemsLoading, errorMessage, successMessage, orderItems, orderTimeline, itemsPaginate, fetchOrderById, fetchOrderItems, fetchOrderTimeline, fetchOrderPaymentDetail, updateOrderStatus, approveOrderPayment, rejectOrderPayment } = useSystemOrders()

const order = ref<Order | null>(null)
const paymentDetail = ref<OrderPaymentDetail>({ payment: null, slips: [] })
const isPaymentDetailLoading = ref(false)
const itemPage = ref(1)
const itemPageSize = ref(10)
const statusForm = ref('')
const shippingTrackingNoForm = ref('')
const isStatusSubmitting = ref(false)
const isPaymentApproving = ref(false)
const isPaymentRejecting = ref(false)
const isRejectModalOpen = ref(false)
const isShippingModalOpen = ref(false)
const rejectReason = ref('')
const timelineRange = ref<'all' | 'today' | '7d' | '30d'>('all')

const toast = reactive({ show: false, type: 'error' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

const totalItemPages = computed(() => (!itemsPaginate.value.size ? 1 : Math.max(1, Math.ceil(itemsPaginate.value.total / itemsPaginate.value.size))))
const isWaitingCustomerRepay = computed(() => Boolean(order.value && order.value.status === 'pending' && order.value.payment_rejected && !order.value.payment_submitted))
const isShippingStatusSelected = computed(() => statusForm.value === 'shipping')
const canSubmitStatus = computed(() => {
  if (!order.value || !statusForm.value || statusForm.value === order.value.status || isStatusSubmitting.value || isWaitingCustomerRepay.value) {
    return false
  }

  return true
})
const canSubmitShippingModal = computed(() => Boolean(shippingTrackingNoForm.value.trim() && !isStatusSubmitting.value))
const canApprovePayment = computed(() => Boolean(order.value && order.value.status === 'pending' && order.value.payment_submitted && !isPaymentApproving.value))
const canRejectPayment = computed(() => Boolean(order.value && order.value.status === 'pending' && order.value.payment_submitted && !isPaymentRejecting.value))
const canSubmitReject = computed(() => Boolean(canRejectPayment.value && rejectReason.value.trim().length > 0))
const filteredTimeline = computed(() => orderTimeline.value.filter((item) => isTimelineInRange(item.created_at, timelineRange.value)))
const statusEffectHint = computed(() => {
  if (statusForm.value === 'paid') return 'เมื่อเปลี่ยนเป็นชำระเงินแล้ว ระบบจะบันทึกข้อมูลการชำระเงินสมาชิก'
  if (statusForm.value === 'shipping') return 'เมื่อเปลี่ยนเป็นกำลังจัดส่ง ระบบจะตัดสต๊อกสินค้าตามจำนวนในคำสั่งซื้อ'
  if (statusForm.value === 'completed') return 'เมื่อเปลี่ยนเป็นสำเร็จ จะปิดงานคำสั่งซื้อและไม่สามารถเปลี่ยนสถานะต่อได้'
  if (statusForm.value === 'cancelled') return 'เมื่อเปลี่ยนเป็นยกเลิก จะยุติคำสั่งซื้อและไม่สามารถเปลี่ยนสถานะต่อได้'
  return ''
})

const statusOptions = computed(() => {
  if (!order.value) return []

  if (isWaitingCustomerRepay.value) return []

  const current = order.value.status
  if (current === 'pending') return [{ label: 'ชำระเงินแล้ว', value: 'paid' }, { label: 'ยกเลิก', value: 'cancelled' }]
  if (current === 'paid') return [{ label: 'กำลังจัดส่ง', value: 'shipping' }, { label: 'ยกเลิก', value: 'cancelled' }]
  if (current === 'shipping') return [{ label: 'สำเร็จ', value: 'completed' }]
  return []
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
    case 'shipping': return 'กำลังจัดส่ง'
    case 'completed': return 'สำเร็จ'
    case 'cancelled': return 'ยกเลิก'
    default: return status || '-'
  }
}

function auditStatusLabel(status?: string) {
  if (status === 'success') return 'สำเร็จ'
  if (status === 'failed') return 'ล้มเหลว'
  return status || '-'
}

function timelineTitle(item: { action_type?: string, from_status?: string, to_status?: string }) {
  if (item.action_type === 'order_payment_submitted') return 'ลูกค้าส่งหลักฐานการชำระเงิน'
  if (item.action_type === 'order_payment_approved') return 'แอดมินอนุมัติการชำระเงิน'
  if (item.action_type === 'order_payment_rejected') return 'แอดมินไม่อนุมัติการชำระเงิน'
  if (item.action_type === 'order_shipping_tracking_updated') return 'บันทึกเลขพัสดุ'

  if (item.from_status || item.to_status) {
    return `${item.from_status ? statusLabel(item.from_status) : '-'} → ${item.to_status ? statusLabel(item.to_status) : '-'}`
  }

  return 'อัปเดตคำสั่งซื้อ'
}

function paymentStatusLabel(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'pending') return 'รอตรวจสอบ'
  if (normalized === 'success') return 'อนุมัติแล้ว'
  if (normalized === 'failed') return 'ไม่ผ่าน'
  if (normalized === 'refunded') return 'คืนเงินแล้ว'
  return status || '-'
}

function paymentStatusClass(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'pending') return 'badge-pending'
  if (normalized === 'success') return 'badge-paid'
  if (normalized === 'failed') return 'badge-cancelled'
  if (normalized === 'refunded') return 'badge-shipping'
  return ''
}

function formatFileSize(size?: number) {
  const value = Number(size || 0)
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

const orderReference = computed(() => {
  if (!order.value) return '-'
  return order.value.order_no || toShortCode(order.value.id, 'ORD')
})

function isTimelineInRange(createdAt: string, range: 'all' | 'today' | '7d' | '30d') {
  if (range === 'all') return true

  const createdDate = new Date(createdAt)
  if (Number.isNaN(createdDate.getTime())) return false

  const now = new Date()
  if (range === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return createdDate.getTime() >= startOfToday
  }

  const days = range === '7d' ? 7 : 30
  const threshold = now.getTime() - (days * 24 * 60 * 60 * 1000)
  return createdDate.getTime() >= threshold
}

async function copyTrackingNo() {
  const trackingNo = String(order.value?.shipping_tracking_no || '').trim()
  if (!trackingNo) return

  try {
    if (import.meta.client && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(trackingNo)
      showToast('success', 'คัดลอกเลขพัสดุแล้ว')
    }
  } catch {
    showToast('error', 'คัดลอกเลขพัสดุไม่สำเร็จ')
  }
}

async function loadOrder() {
  if (!orderId.value) return
  const data = await fetchOrderById(orderId.value)
  order.value = data
  statusForm.value = data?.status || ''
  shippingTrackingNoForm.value = String(data?.shipping_tracking_no || '')

  paymentDetail.value = { payment: null, slips: [] }
  if (!data) return

  isPaymentDetailLoading.value = true
  paymentDetail.value = await fetchOrderPaymentDetail(data)
  isPaymentDetailLoading.value = false
}

async function loadItems(page = 1) {
  if (!orderId.value) return
  itemPage.value = page
  await fetchOrderItems(orderId.value, page, itemPageSize.value)
}

async function refreshPage() {
  await Promise.all([loadOrder(), loadItems(itemPage.value), orderId.value ? fetchOrderTimeline(orderId.value) : Promise.resolve(true)])
}

async function handleUpdateStatus() {
  if (!order.value || !canSubmitStatus.value) return

  if (isShippingStatusSelected.value) {
    isShippingModalOpen.value = true
    return
  }

  isStatusSubmitting.value = true
  const success = await updateOrderStatus(order.value, statusForm.value, '')
  isStatusSubmitting.value = false
  if (!success) return

  await loadOrder()
}

function closeShippingModal() {
  if (isStatusSubmitting.value) return
  isShippingModalOpen.value = false
}

async function confirmShippingStatus() {
  if (!order.value || !canSubmitShippingModal.value) return

  isStatusSubmitting.value = true
  const success = await updateOrderStatus(order.value, 'shipping', shippingTrackingNoForm.value.trim())
  isStatusSubmitting.value = false
  if (!success) return

  isShippingModalOpen.value = false
  await loadOrder()
}

async function handleApprovePayment() {
  if (!order.value || !canApprovePayment.value) return

  isPaymentApproving.value = true
  const success = await approveOrderPayment(order.value.id)
  isPaymentApproving.value = false
  if (!success) return

  await refreshPage()
}

function openRejectModal() {
  if (!canRejectPayment.value) return
  rejectReason.value = ''
  isRejectModalOpen.value = true
}

function closeRejectModal() {
  if (isPaymentRejecting.value) return
  isRejectModalOpen.value = false
}

async function handleRejectPayment() {
  if (!order.value || !canSubmitReject.value) return

  isPaymentRejecting.value = true
  const success = await rejectOrderPayment(order.value.id, rejectReason.value.trim())
  isPaymentRejecting.value = false
  if (!success) return

  isRejectModalOpen.value = false
  rejectReason.value = ''
  await refreshPage()
}

watch(errorMessage, (value) => {
  if (value) showToast('error', value)
})

watch(successMessage, (value) => {
  if (value) showToast('success', value)
})

onMounted(async () => {
  await Promise.all([loadOrder(), loadItems(1), orderId.value ? fetchOrderTimeline(orderId.value) : Promise.resolve(true)])
})

onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`"><span>{{ toast.message }}</span></div>
    </transition>

    <div class="page-header">
      <div>
        <h1 class="page-title">รายละเอียดคำสั่งซื้อ</h1>
        <p class="page-subtitle">ตรวจสอบข้อมูลคำสั่งซื้อและรายการสินค้า</p>
      </div>
      <div class="header-actions">
        <NuxtLink to="/orders" class="btn-secondary">กลับหน้ารายการ</NuxtLink>
        <button class="btn-secondary" :disabled="isLoading || isItemsLoading" @click="refreshPage">รีเฟรช</button>
      </div>
    </div>

    <div class="content-card">
      <div class="card-section" v-if="order">
        <h3 class="section-title">ข้อมูลคำสั่งซื้อ</h3>
        <div class="status-form-row">
          <div class="form-group status-form-group">
            <label>เปลี่ยนสถานะคำสั่งซื้อ</label>
            <select v-model="statusForm" :disabled="isStatusSubmitting || statusOptions.length === 0 || isWaitingCustomerRepay">
              <option :value="order.status">สถานะเดิม: {{ statusLabel(order.status) }}</option>
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
            <p v-if="statusEffectHint" class="status-hint">{{ statusEffectHint }}</p>
            <p v-if="isWaitingCustomerRepay" class="status-hint status-hint-warning">รายการนี้ถูกไม่อนุมัติ กรุณารอลูกค้ายืนยันการชำระเงินใหม่ก่อน</p>
          </div>
          <button class="btn-submit" :disabled="!canSubmitStatus" @click="handleUpdateStatus">บันทึกสถานะ</button>
          <button class="btn-approve" :disabled="!canApprovePayment" @click="handleApprovePayment">อนุมัติการชำระเงิน</button>
          <button class="btn-reject" :disabled="!canRejectPayment" @click="openRejectModal">ไม่อนุมัติการชำระเงิน</button>
        </div>
        <div class="info-grid">
          <div class="info-item"><span class="label">รหัสคำสั่งซื้อ</span><span class="value">{{ orderReference }}</span></div>
          <div class="info-item"><span class="label">สถานะ</span><span class="value"><span class="badge" :class="`badge-${order.status}`">{{ statusLabel(order.status) }}</span></span></div>
          <div class="info-item"><span class="label">รหัสสมาชิก</span><span class="value">{{ toShortCode(order.member_id, 'MEM') }}</span></div>
          <div class="info-item"><span class="label">รหัสการชำระเงิน</span><span class="value">{{ toShortCode(order.payment_id, 'PAY') }}</span></div>
          <div class="info-item"><span class="label">รหัสที่อยู่</span><span class="value">{{ toShortCode(order.address_id, 'ADR') }}</span></div>
          <div class="info-item">
            <span class="label">เลขพัสดุ</span>
            <span class="value value-with-action">
              {{ order.shipping_tracking_no || '-' }}
              <button v-if="order.shipping_tracking_no" type="button" class="copy-btn" @click="copyTrackingNo">คัดลอก</button>
            </span>
          </div>
          <div class="info-item"><span class="label">สร้างเมื่อ</span><span class="value">{{ formatDateTime(order.created_at) }}</span></div>
          <div class="info-item"><span class="label">ยอดรวม</span><span class="value">{{ formatMoney(order.total_amount) }}</span></div>
          <div class="info-item"><span class="label">ส่วนลด</span><span class="value">{{ formatMoney(order.discount_amount) }}</span></div>
          <div class="info-item"><span class="label">ยอดสุทธิ</span><span class="value">{{ formatMoney(order.net_amount) }}</span></div>
        </div>

        <div class="divider section-divider"></div>

        <div>
          <h3 class="section-title">รายละเอียดการชำระเงิน</h3>

          <div v-if="isPaymentDetailLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูลการชำระเงิน...</p></div>

          <div v-else-if="!order.payment_id" class="empty-text">ยังไม่มีการผูกข้อมูลการชำระเงิน</div>

          <div v-else class="space-y-3">
            <div class="info-grid">
              <div class="info-item"><span class="label">รหัสการชำระเงิน</span><span class="value">{{ toShortCode(order.payment_id, 'PAY') }}</span></div>
              <div class="info-item"><span class="label">สถานะการชำระเงิน</span><span class="value"><span class="badge" :class="paymentStatusClass(paymentDetail.payment?.status)">{{ paymentStatusLabel(paymentDetail.payment?.status) }}</span></span></div>
              <div class="info-item"><span class="label">ยอดชำระเงิน</span><span class="value">{{ paymentDetail.payment ? formatMoney(paymentDetail.payment.amount) : '-' }}</span></div>
              <div class="info-item"><span class="label">ผู้อนุมัติ</span><span class="value">{{ toShortCode(paymentDetail.payment?.approved_by, 'ADM') }}</span></div>
              <div class="info-item"><span class="label">เวลาอนุมัติ</span><span class="value">{{ formatDateTime(paymentDetail.payment?.approved_at) }}</span></div>
              <div class="info-item"><span class="label">จำนวนไฟล์สลิป</span><span class="value">{{ paymentDetail.slips.length }}</span></div>
            </div>

            <div v-if="order.payment_rejected" class="rejection-box">
              <p class="rejection-title">รายการนี้ถูกไม่อนุมัติ</p>
              <p class="rejection-reason">เหตุผล: {{ order.payment_rejection_reason || '-' }}</p>
            </div>

            <div v-if="paymentDetail.slips.length > 0" class="slip-grid">
              <div v-for="slip in paymentDetail.slips" :key="slip.id" class="slip-item">
                <img v-if="String(slip.file_type || '').startsWith('image/')" :src="slip.file_path" :alt="slip.file_name || slip.id" class="slip-image" />
                <div class="slip-meta">
                  <p class="slip-name">{{ slip.file_name || '-' }}</p>
                  <p class="slip-info">{{ slip.file_type || '-' }} · {{ formatFileSize(slip.file_size) }}</p>
                </div>
              </div>
            </div>
            <div v-else class="empty-text">ยังไม่มีไฟล์สลิปที่แนบ</div>
          </div>
        </div>
      </div>

      <div class="card-section" v-else-if="isLoading">
        <div class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูลคำสั่งซื้อ...</p></div>
      </div>

      <div class="card-section" v-else>
        <p class="empty-text">ไม่พบข้อมูลคำสั่งซื้อนี้</p>
      </div>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการสินค้าในคำสั่งซื้อ</h3>
        </div>

        <div v-if="isItemsLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดรายการสินค้า...</p></div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>รหัสสินค้า</th>
                <th>จำนวน</th>
                <th>ราคาต่อหน่วย</th>
                <th>รวมรายการ</th>
                <th>สร้างเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="orderItems.length === 0"><td colspan="5" class="empty-cell">ไม่พบรายการสินค้า</td></tr>
              <tr v-for="item in orderItems" :key="item.id">
                <td>{{ toShortCode(item.product_id, 'PRD') }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ formatMoney(item.price_per_unit) }}</td>
                <td>{{ formatMoney(item.total_item_amount) }}</td>
                <td>{{ formatDateTime(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-row">
          <button class="btn-secondary" :disabled="itemPage <= 1 || isItemsLoading" @click="loadItems(itemPage - 1)">ก่อนหน้า</button>
          <span>หน้า {{ itemPage }} / {{ totalItemPages }}</span>
          <button class="btn-secondary" :disabled="itemPage >= totalItemPages || isItemsLoading" @click="loadItems(itemPage + 1)">ถัดไป</button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">ประวัติการเปลี่ยนสถานะ</h3>
          <label class="timeline-filter">
            <span>ช่วงเวลา</span>
            <select v-model="timelineRange">
              <option value="all">ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="7d">7 วันล่าสุด</option>
              <option value="30d">30 วันล่าสุด</option>
            </select>
          </label>
        </div>

        <div v-if="filteredTimeline.length === 0" class="empty-text">ไม่พบประวัติในช่วงเวลาที่เลือก</div>

        <div v-else class="timeline-list">
          <div v-for="(item, index) in filteredTimeline" :key="`${item.created_at}-${index}`" class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-head">
                <span class="timeline-title">{{ timelineTitle(item) }}</span>
                <span class="badge" :class="item.status === 'success' ? 'badge-paid' : 'badge-cancelled'">{{ auditStatusLabel(item.status) }}</span>
              </div>
              <p class="timeline-detail">{{ item.action_detail || '-' }}</p>
              <p class="timeline-meta">{{ formatDateTime(item.created_at) }} · ผู้กระทำ: {{ toShortCode(item.action_by, 'ADM') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isRejectModalOpen" class="modal-overlay" @click.self="closeRejectModal">
      <div class="modal-card">
        <h3 class="modal-title">ไม่อนุมัติการชำระเงิน</h3>
        <p class="modal-desc">กรุณาระบุเหตุผลเพื่อแจ้งกลับลูกค้าในหน้าคำสั่งซื้อ</p>
        <textarea
          v-model="rejectReason"
          class="modal-textarea"
          rows="4"
          placeholder="ระบุเหตุผลที่ไม่อนุมัติ"
        />
        <div class="modal-actions">
          <button class="btn-secondary" :disabled="isPaymentRejecting" @click="closeRejectModal">ยกเลิก</button>
          <button class="btn-reject" :disabled="!canSubmitReject" @click="handleRejectPayment">
            {{ isPaymentRejecting ? 'กำลังบันทึก...' : 'ยืนยันไม่อนุมัติ' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isShippingModalOpen" class="modal-overlay" @click.self="closeShippingModal">
      <div class="modal-card">
        <h3 class="modal-title">กรอกเลขพัสดุ</h3>
        <p class="modal-desc">ก่อนเปลี่ยนสถานะเป็นกำลังจัดส่ง กรุณากรอกเลขพัสดุให้ครบถ้วน</p>
        <input
          v-model="shippingTrackingNoForm"
          type="text"
          class="modal-input"
          placeholder="เช่น TH1234567890"
        >
        <div class="modal-actions">
          <button class="btn-secondary" :disabled="isStatusSubmitting" @click="closeShippingModal">ยกเลิก</button>
          <button class="btn-submit" :disabled="!canSubmitShippingModal" @click="confirmShippingStatus">
            {{ isStatusSubmitting ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page { max-width: 1400px; margin: 0 auto; width: 100%; }
.page-header { margin-bottom: 24px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.page-title { font-size: 28px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
.header-actions { display: flex; gap: 10px; }
.content-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.card-section { padding: 24px; }
.section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 16px 0; }
.status-form-row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 16px; }
.status-form-group { min-width: 280px; }
.status-hint { margin: 6px 0 0 0; font-size: 12px; color: #0f766e; }
.status-hint-warning { color: #b45309; }
.info-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 1024px) { .info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) { .info-grid { grid-template-columns: 1fr; } }
.info-item { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 12px; color: #64748b; }
.value { font-size: 14px; color: #0f172a; font-weight: 600; word-break: break-all; }
.value-with-action { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.copy-btn { height: 26px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #334155; padding: 0 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.copy-btn:hover { background: #f8fafc; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 600; color: #334155; }
.form-group select { height: 42px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 12px; font-size: 14px; outline: none; }
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge-pending { color: #92400e; background: #fffbeb; }
.badge-paid { color: #166534; background: #dcfce7; }
.badge-shipping { color: #1d4ed8; background: #dbeafe; }
.badge-completed { color: #0f766e; background: #ccfbf1; }
.badge-cancelled { color: #991b1b; background: #fee2e2; }
.divider { border-top: 1px solid #e2e8f0; }
.section-divider { margin: 16px 0; }
.table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th,.data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; }
.data-table th { background: #f8fafc; font-weight: 700; }
.empty-cell, .empty-text { text-align: center !important; color: #64748b !important; }
.timeline-list { display: flex; flex-direction: column; gap: 12px; }
.timeline-filter { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; }
.timeline-filter select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }
.timeline-item { display: flex; align-items: flex-start; gap: 10px; }
.timeline-dot { width: 10px; height: 10px; border-radius: 999px; background: #4f46e5; margin-top: 8px; flex-shrink: 0; }
.timeline-content { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
.timeline-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.timeline-title { font-size: 14px; font-weight: 700; color: #0f172a; }
.timeline-detail { margin: 6px 0 2px 0; color: #334155; font-size: 13px; }
.timeline-meta { margin: 0; color: #64748b; font-size: 12px; }
.slip-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 1024px) { .slip-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .slip-grid { grid-template-columns: 1fr; } }
.slip-item { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; overflow: hidden; }
.slip-image { width: 100%; height: 180px; object-fit: contain; background: #f8fafc; }
.slip-meta { padding: 10px; }
.slip-name { margin: 0; font-size: 13px; font-weight: 600; color: #0f172a; word-break: break-all; }
.slip-info { margin: 4px 0 0 0; font-size: 12px; color: #64748b; }
.pagination-row { margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; color: #334155; font-size: 14px; }
.btn-submit { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; color: #fff; background: #4f46e5; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-approve { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; color: #fff; background: #0f766e; }
.btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-reject { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; color: #fff; background: #b91c1c; }
.btn-reject:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid #d1d5db; color: #334155; background: #f8fafc; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
.rejection-box { margin-top: 12px; border: 1px solid #fecaca; border-radius: 10px; background: #fef2f2; padding: 12px; }
.rejection-title { margin: 0; font-size: 13px; font-weight: 700; color: #991b1b; }
.rejection-reason { margin: 4px 0 0 0; font-size: 13px; color: #7f1d1d; white-space: pre-wrap; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 90; }
.modal-card { width: min(520px, 100%); background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; }
.modal-title { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
.modal-desc { margin: 6px 0 0 0; font-size: 13px; color: #475569; }
.modal-textarea { margin-top: 12px; width: 100%; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px; font-size: 14px; color: #0f172a; resize: vertical; min-height: 96px; }
.modal-input { margin-top: 12px; width: 100%; height: 40px; border: 1px solid #d1d5db; border-radius: 10px; padding: 0 12px; font-size: 14px; color: #0f172a; }
.modal-actions { margin-top: 12px; display: flex; justify-content: flex-end; gap: 10px; }
.loading-container { display: flex; align-items: center; gap: 10px; color: #64748b; }
.loading-spinner { width: 22px; height: 22px; border-radius: 999px; border: 2px solid #cbd5e1; border-top-color: #4f46e5; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-notification { position: fixed; top: 88px; right: 24px; z-index: 80; min-width: 240px; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,0.15); background: #fff; }
.toast-error { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
.toast-success { background: #f0fdf4; color: #166534; border-color: #86efac; }
.toast-warning { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
</style>
