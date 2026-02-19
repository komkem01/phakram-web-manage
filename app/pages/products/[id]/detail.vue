<script setup lang="ts">
import type { ProductDetailPayload } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const productId = computed(() => String(route.params.id || ''))
const { isLoading, errorMessage, successMessage, detail, fetchDetail, createDetail, updateDetail, deleteDetail } = useProductDetail()
const { fetchProductById } = useSystemProducts()
const productImagesApi = useProductImages()

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
const isImageDeleteModalOpen = ref(false)
const selectedImageFileName = ref('')
const pendingDeleteImageId = ref('')
const pendingDeleteImageName = ref('')
const productImageInput = ref<HTMLInputElement | null>(null)

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
    loadProductInfo(),
    productImagesApi.fetchImages(productId.value)
  ])
  syncForm()
}

async function onSelectProductImage(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target?.files?.[0]
  if (!file || !productId.value) return

  selectedImageFileName.value = file.name

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })

  await productImagesApi.uploadImage(productId.value, {
    file_name: file.name,
    file_type: file.type || 'image/*',
    file_size: file.size,
    file_base64: base64
  })

  if (target) {
    target.value = ''
  }
}

function openProductImagePicker() {
  productImageInput.value?.click()
}

function formatFileSize(size: number) {
  const value = Number(size || 0)
  if (!Number.isFinite(value) || value <= 0) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

async function handleDeleteProductImage(imageID: string) {
  const normalizedImageID = String(imageID || '').trim()
  if (!productId.value || !normalizedImageID) return

  await productImagesApi.deleteImage(productId.value, normalizedImageID)
}

function openImageDeleteModal(imageId: string, imageName: string) {
  pendingDeleteImageId.value = String(imageId || '').trim()
  pendingDeleteImageName.value = String(imageName || '').trim()
  if (!pendingDeleteImageId.value) return
  isImageDeleteModalOpen.value = true
}

function closeImageDeleteModal() {
  isImageDeleteModalOpen.value = false
  pendingDeleteImageId.value = ''
  pendingDeleteImageName.value = ''
}

async function confirmImageDelete() {
  const imageId = pendingDeleteImageId.value
  closeImageDeleteModal()
  if (!imageId) return
  await handleDeleteProductImage(imageId)
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
watch(() => productImagesApi.successMessage.value, (value) => { if (value) showToast('success', value) })
watch(() => productImagesApi.errorMessage.value, (value) => { if (value) showToast('error', value) })

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

      <div class="image-section">
        <div class="image-section-header">
          <h3 class="image-title">รูปสินค้า</h3>
          <span class="image-count">{{ productImagesApi.images.value.length }} รูป</span>
        </div>

        <input
          ref="productImageInput"
          class="image-input-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          :disabled="productImagesApi.isUploading.value"
          @change="onSelectProductImage"
        >

        <button
          type="button"
          class="image-upload-card"
          :disabled="productImagesApi.isUploading.value"
          @click="openProductImagePicker"
        >
          <div class="upload-icon-wrap">
            <svg class="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15.75V17.25A2.25 2.25 0 0 0 5.25 19.5H18.75A2.25 2.25 0 0 0 21 17.25V15.75M7.5 9L12 4.5M12 4.5L16.5 9M12 4.5V15" />
            </svg>
          </div>
          <div class="upload-content">
            <p class="upload-title">อัปโหลดรูปสินค้า</p>
            <p class="upload-subtitle">รองรับ JPG, PNG, WEBP (สูงสุด 5MB)</p>
            <p v-if="selectedImageFileName" class="upload-file-name">ไฟล์ล่าสุด: {{ selectedImageFileName }}</p>
            <p v-if="productImagesApi.isUploading.value" class="upload-status">กำลังอัปโหลดรูป...</p>
          </div>
        </button>

        <div v-if="productImagesApi.images.value.length" class="image-grid">
          <div v-for="image in productImagesApi.images.value" :key="image.id" class="image-card">
            <img :src="image.file_path" :alt="image.file_name" class="product-image" />
            <div class="image-meta">
              <p class="image-name" :title="image.file_name">{{ image.file_name }}</p>
              <p class="image-size">{{ formatFileSize(image.file_size) }}</p>
              <button
                type="button"
                class="image-delete-btn"
                :disabled="productImagesApi.deletingImageId.value === image.id"
                @click="openImageDeleteModal(image.id, image.file_name)"
              >
                {{ productImagesApi.deletingImageId.value === image.id ? 'กำลังลบ...' : 'ลบรูป' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="image-empty">
          <p class="image-empty-title">ยังไม่มีรูปสินค้า</p>
          <p class="image-empty-subtitle">กดอัปโหลดเพื่อเพิ่มรูปแสดงในหน้าร้าน</p>
        </div>
      </div>
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

    <div v-if="isImageDeleteModalOpen" class="confirm-modal-overlay" @click="closeImageDeleteModal">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal-title">ยืนยันการลบรูปสินค้า</h3>
        <p class="confirm-modal-text">
          คุณต้องการลบรูป
          <strong v-if="pendingDeleteImageName">{{ pendingDeleteImageName }}</strong>
          ใช่หรือไม่?
        </p>
        <div class="confirm-modal-actions">
          <button class="btn-secondary" @click="closeImageDeleteModal">ยกเลิก</button>
          <button class="btn-danger" @click="confirmImageDelete">ลบรูป</button>
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
.image-section { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
.image-section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.image-title { margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; }
.image-count { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #1d4ed8; background: #dbeafe; }
.image-input-hidden { display: none; }
.image-upload-card { width: 100%; border: 1px dashed #a5b4fc; border-radius: 12px; background: #eef2ff; display: flex; align-items: center; gap: 14px; padding: 14px; text-align: left; cursor: pointer; transition: all 0.2s ease; }
.image-upload-card:hover { border-color: #818cf8; background: #e0e7ff; }
.image-upload-card:disabled { opacity: 0.65; cursor: not-allowed; }
.upload-icon-wrap { width: 42px; height: 42px; border-radius: 10px; background: #4f46e5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.upload-icon { width: 22px; height: 22px; color: #ffffff; }
.upload-content { min-width: 0; }
.upload-title { margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; }
.upload-subtitle { margin: 2px 0 0; font-size: 12px; color: #475569; }
.upload-file-name { margin: 6px 0 0; font-size: 12px; color: #334155; font-weight: 600; word-break: break-all; }
.upload-status { margin: 6px 0 0; font-size: 12px; color: #1d4ed8; font-weight: 700; }
.image-grid { margin-top: 14px; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.image-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 3px 8px rgba(15, 23, 42, 0.06); }
.product-image { width: 100%; height: 140px; object-fit: cover; display: block; background: #f8fafc; }
.image-meta { padding: 8px 10px 10px; border-top: 1px solid #f1f5f9; }
.image-name { margin: 0; font-size: 12px; color: #1e293b; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.image-size { margin: 2px 0 0; font-size: 11px; color: #64748b; }
.image-delete-btn { margin-top: 8px; width: 100%; height: 30px; border-radius: 7px; border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; font-size: 12px; font-weight: 700; cursor: pointer; }
.image-delete-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.image-empty { margin-top: 14px; border: 1px dashed #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 16px; }
.image-empty-title { margin: 0; font-size: 14px; font-weight: 700; color: #334155; }
.image-empty-subtitle { margin: 4px 0 0; font-size: 12px; color: #64748b; }
</style>
