<script setup lang="ts">
import type { ProductDetailPayload } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const productId = computed(() => String(route.params.id || ''))
const { isLoading, errorMessage, successMessage, detail, fetchDetail, createDetail, updateDetail, deleteDetail } = useProductDetail()
const { fetchProductById } = useSystemProducts()

const form = reactive<ProductDetailPayload>({
  description: '',
  material: '',
  dimensions: '',
  weight: '',
  care_instructions: ''
})
const dimensionWidth = ref('')
const dimensionLength = ref('')
const productNo = ref('-')

const toast = reactive({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null
const isDeleteModalOpen = ref(false)

const hasDetail = computed(() => Boolean(detail.value))

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.type = type
  toast.message = message
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

function syncForm() {
  form.description = detail.value?.description || ''
  form.material = detail.value?.material || ''
  form.dimensions = detail.value?.dimensions || ''
  form.weight = detail.value ? String(detail.value.weight) : ''
  form.care_instructions = detail.value?.care_instructions || ''

  const rawDimensions = String(form.dimensions || '').trim()
  if (!rawDimensions) {
    dimensionWidth.value = ''
    dimensionLength.value = ''
    return
  }

  const [first = '', second = ''] = rawDimensions.split(/\*|x|X/)
  dimensionWidth.value = first.trim()
  dimensionLength.value = second.trim()
}

async function loadProductInfo() {
  if (!productId.value) return
  const product = await fetchProductById(productId.value)
  productNo.value = product?.product_no || '-'
}

async function load() {
  if (!productId.value) return
  await Promise.all([
    fetchDetail(productId.value),
    loadProductInfo()
  ])
  syncForm()
}

async function handleSubmit() {
  const width = String(dimensionWidth.value ?? '').trim()
  const length = String(dimensionLength.value ?? '').trim()
  const weight = String(form.weight ?? '').trim()

  if (!width || !length) {
    showToast('warning', 'กรุณากรอกขนาดกว้างและยาว')
    return
  }

  if (!weight) {
    showToast('warning', 'กรุณากรอกน้ำหนักสินค้า')
    return
  }

  const payload: ProductDetailPayload = {
    description: form.description.trim(),
    material: form.material.trim(),
    dimensions: `${width}*${length}`,
    weight,
    care_instructions: form.care_instructions.trim()
  }
  const success = hasDetail.value
    ? await updateDetail(productId.value, payload)
    : await createDetail(productId.value, payload)
  if (!success) return
  await load()
}

async function handleDelete() {
  if (!hasDetail.value) return
  const success = await deleteDetail(productId.value)
  if (!success) return
  syncForm()
}

function openDeleteModal() {
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
}

async function confirmDelete() {
  closeDeleteModal()
  await handleDelete()
}

watch(successMessage, (value) => { if (value) showToast('success', value) })
watch(errorMessage, (value) => { if (value) showToast('error', value) })

onMounted(load)
onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`"><span>{{ toast.message }}</span></div>
    </transition>

    <div class="page-header">
      <h1 class="page-title">รายละเอียดสินค้า</h1>
      <p class="page-subtitle">จัดการรายละเอียดสินค้า (รหัสสินค้า: {{ productNo }})</p>
    </div>

    <div class="content-card card-section">
      <div v-if="isLoading" class="loading-container"><div class="loading-spinner"></div><p>กำลังโหลดข้อมูล...</p></div>
      <form v-else @submit.prevent="handleSubmit">
        <div class="form-grid">
          <div class="form-group"><label>คำอธิบาย</label><textarea v-model="form.description"></textarea></div>
          <div class="form-group"><label>วัสดุ</label><input v-model="form.material" type="text" /></div>
          <div class="form-group"><label>ขนาด (กว้าง*ยาว)</label><div class="dimension-group"><input v-model="dimensionWidth" type="number" step="0.01" min="0" placeholder="กว้าง" /><span class="dimension-mul">*</span><input v-model="dimensionLength" type="number" step="0.01" min="0" placeholder="ยาว" /></div></div>
          <div class="form-group"><label>น้ำหนัก (กรัม)</label><input v-model="form.weight" type="number" step="0.01" min="0" placeholder="เช่น 250" /></div>
          <div class="form-group"><label>วิธีดูแลรักษา</label><textarea v-model="form.care_instructions"></textarea></div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-submit">{{ hasDetail ? 'อัปเดตรายละเอียด' : 'บันทึกรายละเอียด' }}</button>
          <button v-if="hasDetail" type="button" class="btn-danger" @click="openDeleteModal">ลบรายละเอียด</button>
          <NuxtLink to="/products" class="btn-secondary">กลับหน้าสินค้า</NuxtLink>
        </div>
      </form>
    </div>

    <div v-if="isDeleteModalOpen" class="confirm-modal-overlay" @click="closeDeleteModal">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal-title">ยืนยันการลบรายละเอียด</h3>
        <p class="confirm-modal-text">คุณต้องการลบรายละเอียดสินค้านี้ใช่หรือไม่?</p>
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
.content-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; }
.card-section { padding: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group input,.form-group textarea { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font-size: 14px; }
.dimension-group { display: flex; align-items: center; gap: 8px; }
.dimension-group input { flex: 1 1 0; }
.dimension-mul { color: #334155; font-weight: 700; }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-submit,.btn-secondary,.btn-danger { height: 40px; border-radius: 8px; padding: 0 14px; display: inline-flex; align-items: center; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; text-decoration: none; }
.btn-submit { color: #fff; background: #4f46e5; }
.btn-secondary { color: #334155; background: #f8fafc; border-color: #d1d5db; }
.btn-danger { color: #fff; background: #dc2626; }
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
