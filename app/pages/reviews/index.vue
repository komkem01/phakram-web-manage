<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { isLoading, errorMessage, successMessage, reviews, paginate, fetchReviews, updateReviewVisibility } = useSystemReviews()

const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const search = ref('')
const visibilityFilter = ref<'all' | 'visible' | 'hidden'>('all')
const hasImagesFilter = ref<'all' | 'yes' | 'no'>('all')
const ratingFilter = ref<number | 0>(0)
const sortBy = ref<'created_at' | 'rating'>('created_at')
const orderBy = ref<'asc' | 'desc'>('desc')
const togglingId = ref<string | null>(null)

const totalPages = computed(() => (!paginate.value.size ? 1 : Math.max(1, Math.ceil(paginate.value.total / paginate.value.size))))

function toMoney(value: string | number) {
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return String(value)
  return numberValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('th-TH')
}

function reviewStars(rating: number) {
  const safe = Math.max(0, Math.min(5, Number(rating || 0)))
  return '★'.repeat(safe) + '☆'.repeat(Math.max(0, 5 - safe))
}

async function load(page = 1) {
  currentPage.value = page
  const params: {
    page: number
    size: number
    search?: string
    is_visible?: boolean
    has_images?: boolean
    rating?: number
    sort_by: 'created_at' | 'rating'
    order_by: 'asc' | 'desc'
  } = {
    page,
    size: pageSize.value,
    sort_by: sortBy.value,
    order_by: orderBy.value
  }

  if (search.value.trim()) {
    params.search = search.value.trim()
  }

  if (visibilityFilter.value === 'visible') {
    params.is_visible = true
  } else if (visibilityFilter.value === 'hidden') {
    params.is_visible = false
  }

  if (hasImagesFilter.value === 'yes') {
    params.has_images = true
  } else if (hasImagesFilter.value === 'no') {
    params.has_images = false
  }

  if (ratingFilter.value > 0) {
    params.rating = ratingFilter.value
  }

  await fetchReviews(params)
}

async function toggleVisibility(itemID: string, nextVisible: boolean) {
  if (!itemID) return

  togglingId.value = itemID
  const success = await updateReviewVisibility(itemID, nextVisible)
  togglingId.value = null

  if (!success) return
  await load(currentPage.value)
}

function handlePageSizeChange() {
  void load(1)
}

function handleSearch() {
  void load(1)
}

function clearFilters() {
  search.value = ''
  visibilityFilter.value = 'all'
  hasImagesFilter.value = 'all'
  ratingFilter.value = 0
  sortBy.value = 'created_at'
  orderBy.value = 'desc'
  pageSize.value = 10
  void load(1)
}

onMounted(async () => {
  await load(1)
})
</script>

<template>
  <div class="reviews-page">
    <div class="page-header">
      <h1 class="page-title">จัดการรีวิวสินค้า</h1>
      <p class="page-subtitle">ตรวจสอบและซ่อน/แสดงรีวิวจากลูกค้า</p>
    </div>

    <div class="content-card">
      <div class="card-section">
        <h3 class="section-title">ตัวกรอง</h3>
        <div class="filter-grid">
          <div class="form-group form-group-wide">
            <label>ค้นหา</label>
            <input
              v-model="search"
              type="text"
              placeholder="ค้นหาจากเลขออเดอร์หรือข้อความรีวิว"
              @keyup.enter="handleSearch"
            >
          </div>

          <div class="form-group">
            <label>สถานะรีวิว</label>
            <select v-model="visibilityFilter" @change="handleSearch">
              <option value="all">ทั้งหมด</option>
              <option value="visible">แสดงอยู่</option>
              <option value="hidden">ซ่อนอยู่</option>
            </select>
          </div>

          <div class="form-group">
            <label>รูปภาพ</label>
            <select v-model="hasImagesFilter" @change="handleSearch">
              <option value="all">มี/ไม่มีรูปทั้งหมด</option>
              <option value="yes">เฉพาะมีรูป</option>
              <option value="no">เฉพาะไม่มีรูป</option>
            </select>
          </div>

          <div class="form-group">
            <label>คะแนน</label>
            <select v-model.number="ratingFilter" @change="handleSearch">
              <option :value="0">ทุกคะแนน</option>
              <option :value="5">5 ดาว</option>
              <option :value="4">4 ดาว</option>
              <option :value="3">3 ดาว</option>
              <option :value="2">2 ดาว</option>
              <option :value="1">1 ดาว</option>
            </select>
          </div>

          <div class="form-group">
            <label>เรียงตาม</label>
            <select v-model="sortBy" @change="handleSearch">
              <option value="created_at">วันที่</option>
              <option value="rating">คะแนน</option>
            </select>
          </div>

          <div class="form-group">
            <label>ลำดับ</label>
            <select v-model="orderBy" @change="handleSearch">
              <option value="desc">มากไปน้อย</option>
              <option value="asc">น้อยไปมาก</option>
            </select>
          </div>

          <div class="form-group">
            <label>จำนวน/หน้า</label>
            <select v-model.number="pageSize" @change="handlePageSizeChange">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} รายการ/หน้า</option>
            </select>
          </div>
        </div>

        <div class="filter-actions">
          <button class="btn-submit" :disabled="isLoading" @click="handleSearch">ค้นหา</button>
          <button class="btn-secondary" :disabled="isLoading" @click="clearFilters">ล้างตัวกรอง</button>
        </div>
      </div>

      <p v-if="errorMessage" class="feedback feedback-error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="feedback feedback-success">{{ successMessage }}</p>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ออเดอร์</th>
              <th>ผู้รีวิว</th>
              <th>คะแนน</th>
              <th>รีวิว</th>
              <th>สถานะ</th>
              <th class="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="6" class="table-empty">กำลังโหลดข้อมูล...</td>
            </tr>
            <tr v-else-if="reviews.length === 0">
              <td colspan="6" class="table-empty">ไม่พบข้อมูลรีวิว</td>
            </tr>
            <tr v-for="item in reviews" :key="item.id" class="table-row">
              <td>
                <p class="order-no">{{ item.order_no || item.order_id }}</p>
                <p class="order-date">{{ formatDate(item.created_at) }}</p>
              </td>
              <td>
                <p>{{ item.member_name || item.member_id }}</p>
                <p v-if="item.is_verified_purchase" class="verified-tag">ยืนยันการซื้อ</p>
              </td>
              <td class="review-stars">{{ reviewStars(item.rating) }}</td>
              <td>
                <p class="review-comment">{{ item.comment }}</p>
                <div v-if="item.image_urls?.length" class="review-images">
                  <a
                    v-for="(url, idx) in item.image_urls"
                    :key="`${item.id}-${idx}`"
                    :href="url"
                    target="_blank"
                    class="image-thumb"
                  >
                    <img :src="url" alt="review-image">
                  </a>
                </div>
              </td>
              <td>
                <span class="status-pill" :class="item.is_visible ? 'status-visible' : 'status-hidden'">
                  {{ item.is_visible ? 'แสดง' : 'ซ่อน' }}
                </span>
              </td>
              <td class="text-right">
                <button
                  class="action-btn"
                  :class="item.is_visible ? 'action-hide' : 'action-show'"
                  :disabled="togglingId === item.id"
                  @click="toggleVisibility(item.id, !item.is_visible)"
                >
                  {{ togglingId === item.id ? 'กำลังบันทึก...' : item.is_visible ? 'ซ่อนรีวิว' : 'แสดงรีวิว' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <p class="pagination-text">ทั้งหมด {{ toMoney(paginate.total) }} รายการ</p>
        <div class="pagination-controls">
          <button class="btn-secondary" :disabled="currentPage <= 1 || isLoading" @click="load(currentPage - 1)">ก่อนหน้า</button>
          <span class="page-indicator">หน้า {{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-secondary" :disabled="currentPage >= totalPages || isLoading" @click="load(currentPage + 1)">ถัดไป</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reviews-page { display: grid; gap: 16px; }
.page-header { display: grid; gap: 4px; }
.page-title { font-size: 32px; font-weight: 700; color: #0f172a; margin: 0; }
.page-subtitle { font-size: 14px; color: #475569; margin: 0; }

.content-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.card-section { padding: 18px; display: grid; gap: 12px; }
.section-title { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }

.filter-grid { display: grid; gap: 10px; grid-template-columns: repeat(1, minmax(0, 1fr)); }
.form-group { display: grid; gap: 6px; }
.form-group-wide { grid-column: span 1; }
.form-group label { font-size: 12px; font-weight: 600; color: #475569; }
.form-group input,
.form-group select { height: 40px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 12px; font-size: 14px; outline: none; background: #fff; color: #334155; }
.form-group input:focus,
.form-group select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12); }

.filter-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btn-submit,
.btn-secondary,
.action-btn { height: 36px; border-radius: 8px; border: 1px solid transparent; padding: 0 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-submit { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.btn-submit:hover { background: #4338ca; }
.btn-secondary { background: #fff; border-color: #d1d5db; color: #334155; }
.btn-secondary:hover { background: #f8fafc; }
.btn-submit:disabled,
.btn-secondary:disabled,
.action-btn:disabled { cursor: not-allowed; opacity: 0.6; }

.feedback { margin: 0 18px 12px; border-radius: 8px; border: 1px solid; padding: 10px 12px; font-size: 14px; font-weight: 500; }
.feedback-error { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.feedback-success { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }

.table-wrapper { margin: 0 18px; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
.data-table { width: 100%; min-width: 980px; border-collapse: collapse; }
.data-table th,
.data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; color: #334155; vertical-align: top; }
.data-table th { background: #f8fafc; font-weight: 700; color: #334155; }
.table-empty { text-align: center !important; color: #64748b !important; padding: 24px 12px !important; }

.order-no { margin: 0; font-weight: 700; color: #0f172a; }
.order-date { margin: 4px 0 0; font-size: 12px; color: #64748b; }
.review-stars { color: #f59e0b !important; white-space: nowrap; }
.review-comment { margin: 0; color: #334155; white-space: pre-wrap; word-break: break-word; }
.verified-tag { margin: 4px 0 0; display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; padding: 2px 8px; font-size: 11px; font-weight: 700; }

.review-images { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.image-thumb { width: 52px; height: 52px; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; display: block; background: #f8fafc; }
.image-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

.status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; }
.status-visible { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.status-hidden { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

.action-btn { background: #fff; }
.action-hide { border-color: #fecaca; color: #b91c1c; }
.action-hide:hover { background: #fef2f2; }
.action-show { border-color: #bbf7d0; color: #15803d; }
.action-show:hover { background: #f0fdf4; }

.pagination-bar { margin: 14px 18px 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.pagination-text { margin: 0; font-size: 14px; color: #475569; }
.pagination-controls { display: flex; align-items: center; gap: 8px; }
.page-indicator { font-size: 14px; color: #475569; }

@media (min-width: 860px) {
  .filter-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .form-group-wide { grid-column: span 2; }
}
</style>
