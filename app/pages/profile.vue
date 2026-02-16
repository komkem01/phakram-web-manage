<script setup lang="ts">
import type { UpdateProfileData, ChangePasswordData } from '~/types/profile'

definePageMeta({
  layout: 'dashboard'
})

const { profile, isLoading, errorMessage, successMessage, fetchProfile, updateProfile, changePassword } = useProfile()

const profileForm = reactive<UpdateProfileData>({
  firstname_th: '',
  lastname_th: '',
  firstname_en: '',
  lastname_en: '',
  phone: null
})

const passwordForm = reactive<ChangePasswordData>({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const activeTab = ref<'profile' | 'password'>('profile')
const isSubmitting = ref(false)
const toast = reactive({
  show: false,
  type: 'success' as 'success' | 'error' | 'warning',
  message: ''
})
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await fetchProfile()
  if (profile.value) {
    profileForm.firstname_th = profile.value.firstname_th || ''
    profileForm.lastname_th = profile.value.lastname_th || ''
    profileForm.firstname_en = profile.value.firstname_en || ''
    profileForm.lastname_en = profile.value.lastname_en || ''
    profileForm.phone = profile.value.phone || null
  }
})

async function handleUpdateProfile() {
  isSubmitting.value = true
  await updateProfile(profileForm)
  isSubmitting.value = false
}

async function handleChangePassword() {
  isSubmitting.value = true
  const success = await changePassword(passwordForm)
  isSubmitting.value = false
  
  if (success) {
    passwordForm.current_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
  }
}

function switchTab(tab: 'profile' | 'password') {
  activeTab.value = tab
  errorMessage.value = ''
  successMessage.value = ''
}

function showToast(type: 'success' | 'error' | 'warning', message: string) {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  toast.show = true
  toast.type = type
  toast.message = message

  toastTimer = setTimeout(() => {
    toast.show = false
    if (type === 'success') {
      successMessage.value = ''
    } else {
      errorMessage.value = ''
    }
  }, 3000)
}

watch(successMessage, (value) => {
  if (value) {
    showToast('success', value)
  }
})

watch(errorMessage, (value) => {
  if (value) {
    const warningKeywords = ['กรุณา', 'ไม่ตรงกัน', 'required', 'invalid']
    const isWarning = warningKeywords.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase()))
    showToast(isWarning ? 'warning' : 'error', value)
  }
})

onBeforeUnmount(() => {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
})
</script>

<template>
  <div class="profile-page">
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="`toast-${toast.type}`">
        <svg v-if="toast.type === 'success'" class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="toast.type === 'error'" class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86l-7.15 12.4A2 2 0 004.86 19h14.28a2 2 0 001.72-2.74l-7.15-12.4a2 2 0 00-3.42 0z" />
        </svg>
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">ตั้งค่าข้อมูลส่วนตัว</h1>
        <p class="page-subtitle">จัดการข้อมูลโปรไฟล์และรหัสผ่านของคุณ</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !profile" class="loading-container">
      <div class="loading-spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Content -->
    <div v-else class="profile-container">
      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'profile' }"
          @click="switchTab('profile')"
        >
          <svg class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          ข้อมูลส่วนตัว
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'password' }"
          @click="switchTab('password')"
        >
          <svg class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          เปลี่ยนรหัสผ่าน
        </button>
      </div>

      <!-- Profile Tab -->
      <div v-show="activeTab === 'profile'" class="content-card">
        <div class="card-section">
          <h3 class="section-title">ข้อมูลบัญชี</h3>
          <div class="info-row">
            <span class="info-label">รหัสสมาชิก</span>
            <span class="info-value">{{ profile?.member_no || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">อีเมล</span>
            <span class="info-value">{{ profile?.email || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">บทบาท</span>
            <span class="info-value badge-role">{{ profile?.role || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">สถานะ</span>
            <span class="info-value badge-status">{{ profile?.is_admin ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน' }}</span>
          </div>
        </div>

        <div class="divider"></div>

        <form @submit.prevent="handleUpdateProfile" class="card-section">
          <h3 class="section-title">แก้ไขข้อมูลส่วนตัว</h3>

          <div class="form-grid">
            <div class="form-group">
              <label for="firstname_th">ชื่อ (ไทย)</label>
              <input
                id="firstname_th"
                v-model="profileForm.firstname_th"
                type="text"
                placeholder="กรอกชื่อภาษาไทย"
                :disabled="isSubmitting"
                required
              >
            </div>

            <div class="form-group">
              <label for="lastname_th">นามสกุล (ไทย)</label>
              <input
                id="lastname_th"
                v-model="profileForm.lastname_th"
                type="text"
                placeholder="กรอกนามสกุลภาษาไทย"
                :disabled="isSubmitting"
                required
              >
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="firstname_en">ชื่อ (อังกฤษ)</label>
              <input
                id="firstname_en"
                v-model="profileForm.firstname_en"
                type="text"
                placeholder="First Name"
                :disabled="isSubmitting"
                required
              >
            </div>

            <div class="form-group">
              <label for="lastname_en">นามสกุล (อังกฤษ)</label>
              <input
                id="lastname_en"
                v-model="profileForm.lastname_en"
                type="text"
                placeholder="Last Name"
                :disabled="isSubmitting"
                required
              >
            </div>
          </div>

          <div class="form-group">
            <label for="phone">เบอร์โทรศัพท์</label>
            <input
              id="phone"
              v-model="profileForm.phone"
              type="tel"
              placeholder="กรอกเบอร์โทรศัพท์ (ไม่บังคับ)"
              :disabled="isSubmitting"
            >
          </div>

          <button type="submit" class="btn-submit" :disabled="isSubmitting">
            <span v-if="!isSubmitting">บันทึกข้อมูล</span>
            <span v-else class="btn-loading">
              <svg class="spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
              </svg>
              กำลังบันทึก...
            </span>
          </button>
        </form>
      </div>

      <!-- Password Tab -->
      <div v-show="activeTab === 'password'" class="content-card">
        <form @submit.prevent="handleChangePassword" class="card-section">
          <h3 class="section-title">เปลี่ยนรหัสผ่าน</h3>
          <p class="section-description">กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่</p>

          <div class="form-group">
            <label for="current_password">รหัสผ่านปัจจุบัน</label>
            <input
              id="current_password"
              v-model="passwordForm.current_password"
              type="password"
              placeholder="กรอกรหัสผ่านปัจจุบัน"
              :disabled="isSubmitting"
              required
            >
          </div>

          <div class="form-group">
            <label for="new_password">รหัสผ่านใหม่</label>
            <input
              id="new_password"
              v-model="passwordForm.new_password"
              type="password"
              placeholder="กรอกรหัสผ่านใหม่"
              :disabled="isSubmitting"
              required
            >
          </div>

          <div class="form-group">
            <label for="confirm_password">ยืนยันรหัสผ่านใหม่</label>
            <input
              id="confirm_password"
              v-model="passwordForm.confirm_password"
              type="password"
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              :disabled="isSubmitting"
              required
            >
          </div>

          <button type="submit" class="btn-submit btn-danger" :disabled="isSubmitting">
            <span v-if="!isSubmitting">เปลี่ยนรหัสผ่าน</span>
            <span v-else class="btn-loading">
              <svg class="spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
              </svg>
              กำลังเปลี่ยน...
            </span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}

.profile-page {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.toast-notification {
  position: fixed;
  top: 88px;
  right: 24px;
  z-index: 80;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
  max-width: 420px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
  font-size: 14px;
  font-weight: 600;
}

.toast-success {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.toast-error {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.toast-warning {
  background: #fffbeb;
  border-color: #fcd34d;
  color: #92400e;
}

.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.25s ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #cbd5e1;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-container p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-button:hover {
  color: #475569;
  background: #f8fafc;
}

.tab-button.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.content-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.card-section {
  padding: 24px;
}

.divider {
  height: 1px;
  background: #e2e8f0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.section-description {
  font-size: 14px;
  color: #64748b;
  margin: -8px 0 20px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.badge-role,
.badge-status {
  padding: 4px 12px;
  border-radius: 6px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 13px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-grid + .form-group {
  margin-top: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-grid .form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  background: white;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input::placeholder {
  color: #94a3b8;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.btn-submit {
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-weight: 600;
  font-size: 15px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-submit.btn-danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.btn-submit.btn-danger:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 0.8s linear infinite;
}

@media (min-width: 768px) {
  .page-title {
    font-size: 32px;
  }
  
  .page-subtitle {
    font-size: 15px;
  }
}
</style>
