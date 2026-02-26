<script setup lang="ts">
import type { CookiePolicyVersionItem, CreateCookiePolicyVersionPayload } from '~/types/settings'
import { useCookiePolicySettings } from '~/composables/useCookiePolicySettings'

definePageMeta({ layout: 'dashboard' })

const {
  isLoading,
  isCreating,
  errorMessage,
  successMessage,
  versions,
  fetchVersions,
  createVersion
} = useCookiePolicySettings()

const form = reactive<CreateCookiePolicyVersionPayload>({
  title: '',
  content: ''
})

const toast = reactive({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null
const isPreviewOpen = ref(false)
const previewShowTerms = ref(false)
const previewDevice = ref<'desktop' | 'mobile'>('desktop')

const activeVersion = computed(() => versions.value.find((item: CookiePolicyVersionItem) => item.is_active) || null)

function toDateTime(timestamp?: number) {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString('th-TH')
}

function resetForm() {
  form.title = activeVersion.value?.title || ''
  form.content = activeVersion.value?.content || ''
}

function openPreview() {
  isPreviewOpen.value = true
  previewShowTerms.value = false
  previewDevice.value = 'desktop'
}

function closePreview() {
  isPreviewOpen.value = false
  previewShowTerms.value = false
}

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.type = type
  toast.message = message
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

async function handleCreateVersion() {
  if (!form.title.trim() || !form.content.trim()) {
    showToast('warning', 'กรุณากรอกหัวข้อและข้อความเงื่อนไขให้ครบ')
    return
  }

  const created = await createVersion({
    title: form.title.trim(),
    content: form.content.trim()
  })

  if (!created) return
  resetForm()
}

watch(successMessage, (value) => {
  if (value) showToast('success', value)
})

watch(errorMessage, (value) => {
  if (value) showToast('error', value)
})

onMounted(async () => {
  const ok = await fetchVersions()
  if (ok) {
    resetForm()
  }
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="settings-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`"><span>{{ toast.message }}</span></div>
    </transition>

    <div class="page-header">
      <h1 class="page-title">ตั้งค่าพื้นฐาน - เงื่อนไขคุกกี้</h1>
      <p class="page-subtitle">แก้ไขข้อความเงื่อนไขการใช้งานคุกกี้ และออกเวอร์ชันใหม่</p>
    </div>

    <div class="content-card">
      <div class="card-section">
        <h3 class="section-title">ออกเวอร์ชันเงื่อนไขใหม่</h3>

        <div class="form-grid">
          <div class="form-group">
            <label for="policy_title">หัวข้อ</label>
            <input id="policy_title" v-model="form.title" type="text" :disabled="isCreating" placeholder="เช่น เงื่อนไขการใช้งานคุกกี้" />
          </div>
          <div class="form-group full-width">
            <label for="policy_content">ข้อความเงื่อนไข</label>
            <textarea id="policy_content" v-model="form.content" :disabled="isCreating" rows="8" placeholder="ระบุข้อความเงื่อนไขการใช้งานเว็บและคุกกี้"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-submit" :disabled="isCreating" @click="handleCreateVersion">
            {{ isCreating ? 'กำลังบันทึก...' : 'ออกเวอร์ชันใหม่' }}
          </button>
          <button type="button" class="btn-secondary" :disabled="isCreating" @click="openPreview">ดูตัวอย่าง modal ฝั่งลูกค้า</button>
          <button type="button" class="btn-secondary" :disabled="isCreating" @click="resetForm">รีเซ็ต</button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="card-section">
        <div class="table-header">
          <h3 class="section-title">ประวัติเวอร์ชันเงื่อนไข</h3>
          <button class="btn-secondary" :disabled="isLoading" @click="fetchVersions">รีเฟรช</button>
        </div>

        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>หัวข้อ</th>
                <th>สถานะ</th>
                <th>วันที่มีผล</th>
                <th>อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="versions.length === 0">
                <td colspan="5" class="empty-cell">ไม่พบข้อมูล</td>
              </tr>
              <tr v-for="item in versions" :key="item.policy_id">
                <td>v{{ item.version_no }}</td>
                <td>{{ item.title }}</td>
                <td>
                  <span class="badge" :class="item.is_active ? 'badge-success' : 'badge-muted'">
                    {{ item.is_active ? 'ใช้งานอยู่' : 'เวอร์ชันเก่า' }}
                  </span>
                </td>
                <td>{{ toDateTime(item.effective_at) }}</td>
                <td>{{ toDateTime(item.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="isPreviewOpen" class="preview-overlay" @click="closePreview">
      <div class="preview-modal" :class="{ 'preview-mobile': previewDevice === 'mobile' }" @click.stop>
        <div class="preview-device-toggle">
          <button
            type="button"
            class="btn-secondary btn-device"
            :class="{ 'btn-device-active': previewDevice === 'desktop' }"
            @click="previewDevice = 'desktop'"
          >
            เดสก์ท็อป
          </button>
          <button
            type="button"
            class="btn-secondary btn-device"
            :class="{ 'btn-device-active': previewDevice === 'mobile' }"
            @click="previewDevice = 'mobile'"
          >
            มือถือ
          </button>
        </div>

        <div class="preview-mock-wrapper" :class="{ 'preview-mock-mobile': previewDevice === 'mobile' }">
          <div class="preview-mock-header">
            <div class="preview-mock-logo"></div>
            <div class="preview-mock-nav">
              <span></span><span></span><span></span>
            </div>
            <div class="preview-mock-actions"></div>
          </div>
          <div class="preview-mock-content">
            <div class="preview-mock-banner"></div>
            <div class="preview-mock-grid">
              <div class="preview-mock-card"></div>
              <div class="preview-mock-card"></div>
              <div class="preview-mock-card"></div>
            </div>
          </div>
          <div class="preview-mock-overlay"></div>
        </div>

        <h2 class="preview-title">{{ form.title.trim() || 'เงื่อนไขการใช้งานคุกกี้' }}</h2>
        <p class="preview-subtitle">เว็บไซต์นี้มีการใช้คุกกี้เพื่อการใช้งานที่จำเป็นและเพื่อพัฒนาประสบการณ์ผู้ใช้</p>

        <div v-if="previewShowTerms" class="preview-content">
          {{ form.content.trim() || 'ยังไม่มีข้อความเงื่อนไข' }}
        </div>

        <div class="preview-actions">
          <button
            v-if="!previewShowTerms"
            type="button"
            class="btn-secondary"
            @click="previewShowTerms = true"
          >
            อ่านเงื่อนไขก่อน
          </button>
          <button
            v-else
            type="button"
            class="btn-secondary"
            @click="previewShowTerms = false"
          >
            ซ่อนเงื่อนไข
          </button>
          <button type="button" class="btn-submit" @click="closePreview">ยินยอม (ตัวอย่าง)</button>
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
.full-width { grid-column: span 2 / span 2; }
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .full-width { grid-column: span 1 / span 1; }
}
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 600; color: #334155; }
.form-group input,
.form-group textarea { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font-size: 14px; outline: none; transition: all 0.2s ease; }
.form-group input { height: 42px; }
.form-group input:focus,
.form-group textarea:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-submit,
.btn-secondary { height: 40px; border-radius: 8px; padding: 0 14px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; transition: all 0.2s ease; }
.btn-submit { color: #fff; background: #4f46e5; }
.btn-submit:hover:not(:disabled) { background: #4338ca; }
.btn-secondary { color: #334155; background: #f8fafc; border-color: #d1d5db; }
.btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
.divider { border-top: 1px solid #e2e8f0; }
.table-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; min-width: 760px; }
.data-table thead th { text-align: left; font-size: 12px; color: #64748b; font-weight: 700; padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.data-table tbody td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; vertical-align: top; }
.empty-cell { text-align: center; color: #94a3b8; }
.badge { display: inline-flex; align-items: center; justify-content: center; min-width: 72px; height: 24px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
.badge-success { background: #dcfce7; color: #15803d; }
.badge-muted { background: #e2e8f0; color: #475569; }
.loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #64748b; min-height: 160px; }
.loading-spinner { width: 28px; height: 28px; border: 3px solid #cbd5e1; border-top-color: #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite; }
.toast-notification { position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 280px; max-width: 420px; padding: 14px 16px; border-radius: 10px; color: #fff; font-weight: 600; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.25); }
.toast-success { background: #16a34a; }
.toast-error { background: #dc2626; }
.toast-warning { background: #d97706; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.25s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateY(-8px); }
.preview-overlay { position: fixed; inset: 0; z-index: 1001; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.5); padding: 16px; }
.preview-modal { width: 100%; max-width: 560px; border-radius: 16px; background: #fff; padding: 20px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25); }
.preview-mobile { max-width: 360px; }
.preview-device-toggle { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 10px; }
.btn-device { height: 34px; padding: 0 12px; font-size: 12px; }
.btn-device-active { background: #e0e7ff; border-color: #6366f1; color: #3730a3; }
.preview-mock-wrapper { position: relative; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff; }
.preview-mock-mobile { border-radius: 14px; }
.preview-mock-header { height: 42px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.preview-mock-logo { width: 80px; height: 10px; border-radius: 9999px; background: #cbd5e1; }
.preview-mock-nav { display: flex; gap: 6px; }
.preview-mock-nav span { width: 46px; height: 8px; border-radius: 9999px; background: #e2e8f0; }
.preview-mock-actions { margin-left: auto; width: 20px; height: 20px; border-radius: 9999px; background: #cbd5e1; }
.preview-mock-content { padding: 12px; background: #ffffff; }
.preview-mock-banner { height: 38px; border-radius: 8px; background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%); margin-bottom: 10px; }
.preview-mock-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.preview-mock-card { height: 54px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; }
.preview-mock-overlay { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.35); }
.preview-mobile .preview-mock-grid { grid-template-columns: 1fr 1fr; }
.preview-title { margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; }
.preview-subtitle { margin: 8px 0 0; color: #475569; font-size: 14px; line-height: 1.6; }
.preview-content { margin-top: 16px; max-height: 240px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; padding: 12px; color: #334155; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
.preview-actions { margin-top: 16px; display: flex; gap: 10px; justify-content: flex-end; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
