<script setup lang="ts">
import type { ContactMessageItem } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, messages, paginate, fetchMessages, markAsRead, fetchUnreadCount } = useContactMessages()

const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const searchKeyword = ref('')
const sendStatusFilter = ref('')
const readStatusFilter = ref('')
const selectedMessage = ref<ContactMessageItem | null>(null)
const isDetailModalOpen = ref(false)

const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('th-TH')
}

function statusLabel(value: string) {
  const v = String(value || '').toLowerCase()
  if (v === 'sent') return 'ส่งแล้ว'
  if (v === 'failed') return 'ส่งไม่สำเร็จ'
  if (v === 'pending') return 'รอส่ง'
  return value || '-'
}

function statusClass(value: string) {
  const v = String(value || '').toLowerCase()
  if (v === 'sent') return 'badge-success'
  if (v === 'failed') return 'badge-failed'
  if (v === 'pending') return 'badge-pending'
  return 'badge-muted'
}

function readBadgeClass(isRead: boolean) {
  return isRead ? 'badge-read' : 'badge-unread'
}

function readBadgeLabel(isRead: boolean) {
  return isRead ? 'อ่านแล้ว' : 'ยังไม่อ่าน'
}

async function load(page = 1) {
  currentPage.value = page
  await fetchMessages({
    page,
    size: pageSize.value,
    sort_by: 'created_at',
    order_by: 'desc',
    send_status: sendStatusFilter.value || undefined,
    read_status: (readStatusFilter.value as 'read' | 'unread' | '') || undefined,
    search: searchKeyword.value.trim() || undefined
  })
}

function openDetail(item: ContactMessageItem) {
  selectedMessage.value = item
  isDetailModalOpen.value = true
}

function closeDetail() {
  isDetailModalOpen.value = false
  selectedMessage.value = null
}

function handlePageSizeChange() {
  void load(1)
}

function handleFilterChange() {
  void load(1)
}

async function toggleRead(item: ContactMessageItem, isRead: boolean) {
  const ok = await markAsRead(item.id, isRead)
  if (!ok) return

  item.is_read = isRead
  item.read_at = isRead ? new Date().toISOString() : null
  await fetchUnreadCount()
}

onMounted(async () => {
  await load(1)
  await fetchUnreadCount()
})
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">ข้อความติดต่อจากลูกค้า</h1>
      <p class="page-subtitle">ตรวจสอบข้อความที่ส่งมาจากหน้า Contact</p>
    </div>

    <div class="content-card">
      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">รายการข้อความ</h3>

          <div class="header-actions">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="ค้นหาชื่อ/อีเมล/หัวข้อ"
              class="filter-input"
              @keyup.enter="handleFilterChange"
            >
            <select v-model="sendStatusFilter" class="filter-select" @change="handleFilterChange">
              <option value="">ทุกสถานะ</option>
              <option value="sent">ส่งแล้ว</option>
              <option value="failed">ส่งไม่สำเร็จ</option>
              <option value="pending">รอส่ง</option>
            </select>
            <select v-model="readStatusFilter" class="filter-select" @change="handleFilterChange">
              <option value="">ทุกการอ่าน</option>
              <option value="read">อ่านแล้ว</option>
              <option value="unread">ยังไม่อ่าน</option>
            </select>
            <button class="btn-secondary" :disabled="isLoading" @click="load(currentPage)">รีเฟรช</button>
          </div>
        </div>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>วันที่ส่ง</th>
                <th>ชื่อผู้ติดต่อ</th>
                <th>อีเมล</th>
                <th>หัวข้อ</th>
                <th>สถานะส่งเมล</th>
                <th>สถานะอ่าน</th>
                <th class="actions-col">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="messages.length === 0">
                <td colspan="7" class="empty-cell">ไม่พบข้อมูล</td>
              </tr>
              <tr v-for="item in messages" :key="item.id">
                <td>{{ formatDateTime(item.created_at) }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.email }}</td>
                <td class="subject-col">{{ item.subject }}</td>
                <td>
                  <span class="badge" :class="statusClass(item.send_status)">{{ statusLabel(item.send_status) }}</span>
                </td>
                <td>
                  <span class="badge" :class="readBadgeClass(item.is_read)">{{ readBadgeLabel(item.is_read) }}</span>
                </td>
                <td class="actions-col">
                  <div class="actions-grid">
                    <button type="button" class="action-link action-detail" @click="openDetail(item)">ดูรายละเอียด</button>
                    <button v-if="!item.is_read" type="button" class="action-link action-read" @click="toggleRead(item, true)">อ่านแล้ว</button>
                    <button v-else type="button" class="action-link action-unread" @click="toggleRead(item, false)">ยังไม่อ่าน</button>
                  </div>
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

    <div v-if="isDetailModalOpen" class="detail-modal-overlay" @click="closeDetail">
      <div class="detail-modal" @click.stop>
        <h3 class="detail-title">รายละเอียดข้อความ</h3>

        <div v-if="selectedMessage" class="detail-content">
          <div class="detail-row"><span>ชื่อ:</span><strong>{{ selectedMessage.name }}</strong></div>
          <div class="detail-row"><span>อีเมล:</span><strong>{{ selectedMessage.email }}</strong></div>
          <div class="detail-row"><span>หัวข้อ:</span><strong>{{ selectedMessage.subject }}</strong></div>
          <div class="detail-row"><span>สถานะ:</span><strong>{{ statusLabel(selectedMessage.send_status) }}</strong></div>
          <div class="detail-row"><span>การอ่าน:</span><strong>{{ readBadgeLabel(selectedMessage.is_read) }}</strong></div>
          <div class="detail-row"><span>วันที่ส่ง:</span><strong>{{ formatDateTime(selectedMessage.created_at) }}</strong></div>
          <div class="detail-row"><span>เวลาอ่าน:</span><strong>{{ formatDateTime(selectedMessage.read_at) }}</strong></div>
          <div v-if="selectedMessage.send_error" class="detail-error">ข้อผิดพลาดการส่ง: {{ selectedMessage.send_error }}</div>
          <div class="detail-message">{{ selectedMessage.message }}</div>
        </div>

        <div class="detail-actions">
          <button class="btn-secondary" @click="closeDetail">ปิด</button>
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
.table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
.header-actions { display: inline-flex; align-items: center; gap: 10px; }
.filter-input { height: 40px; min-width: 220px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 10px; background: #fff; color: #334155; }
.filter-select { height: 40px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 10px; background: #fff; color: #334155; }
.btn-secondary { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid #d1d5db; background: #f8fafc; color: #334155; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.error-text { color: #b91c1c; font-size: 14px; margin: 0 0 12px 0; }
.table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; min-width: 920px; border-collapse: collapse; }
.data-table th,.data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; }
.data-table th { background: #f8fafc; font-weight: 700; }
.subject-col { max-width: 240px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.empty-cell { text-align: center !important; color: #64748b !important; }
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge-success { color: #166534; background: #dcfce7; }
.badge-failed { color: #991b1b; background: #fee2e2; }
.badge-pending { color: #92400e; background: #fef3c7; }
.badge-read { color: #0f766e; background: #ccfbf1; }
.badge-unread { color: #1d4ed8; background: #dbeafe; }
.badge-muted { color: #64748b; background: #e2e8f0; }
.actions-col { width: 140px; text-align: center !important; }
.actions-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
.action-link { display: inline-flex; align-items: center; justify-content: center; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; font-weight: 700; cursor: pointer; }
.action-read { border-color: #6ee7b7; background: #ecfdf5; color: #047857; }
.action-unread { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
.loading-container { display: flex; align-items: center; gap: 10px; color: #64748b; }
.loading-spinner { width: 22px; height: 22px; border-radius: 999px; border: 2px solid #cbd5e1; border-top-color: #4f46e5; animation: spin 0.8s linear infinite; }
.pagination-row { margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; color: #334155; font-size: 14px; flex-wrap: wrap; }
.page-size-control { display: inline-flex; align-items: center; gap: 8px; margin-right: 8px; }
.page-size-control select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }

.detail-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 90; padding: 16px; }
.detail-modal { width: min(96vw, 720px); max-height: 88vh; overflow-y: auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; }
.detail-title { margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1e293b; }
.detail-content { display: flex; flex-direction: column; gap: 10px; }
.detail-row { display: flex; gap: 8px; font-size: 14px; color: #334155; }
.detail-row span { color: #64748b; min-width: 90px; }
.detail-message { margin-top: 8px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 12px; white-space: pre-wrap; color: #0f172a; }
.detail-error { margin-top: 4px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; padding: 10px; color: #991b1b; font-size: 13px; }
.detail-actions { margin-top: 16px; display: flex; justify-content: flex-end; }

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1023px) {
  .card-section { padding: 18px; }
}

@media (max-width: 767px) {
  .pagination-row { justify-content: flex-start; }
}
</style>
