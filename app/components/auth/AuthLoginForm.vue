<script setup lang="ts">
import type { LoginCredentials } from '~/types/auth'
import { AUTH_CONFIG } from '~/constants/auth'

const form = reactive<LoginCredentials>({
  email: '',
  password: ''
})

const rememberMe = ref(false)
const isPageReady = ref(false)
const REMEMBER_EMAIL_KEY = 'remember_admin_email'
const toast = reactive({
  show: false,
  type: 'success' as 'success' | 'error' | 'warning',
  message: ''
})
let toastTimer: ReturnType<typeof setTimeout> | null = null

const { isLoading, errorMessage, successMessage, login } = useAdminAuth()

onMounted(() => {
  if (process.client) {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (rememberedEmail) {
      form.email = rememberedEmail
      rememberMe.value = true
    }
  }

  const setReady = () => {
    isPageReady.value = true
    window.removeEventListener('load', setReady)
  }

  if (document.readyState === 'complete') {
    setReady()
    return
  }

  window.addEventListener('load', setReady)
})

async function handleLogin() {
  if (!form.email || !form.password) {
    errorMessage.value = AUTH_CONFIG.messages.requiredFields
    return
  }

  const success = await login(form)
  
  if (success) {
    successMessage.value = 'เข้าสู่ระบบสำเร็จ'

    if (process.client) {
      if (rememberMe.value) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, form.email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
    }

    await new Promise(resolve => setTimeout(resolve, 900))
    await navigateTo('/dashboard')
  }
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
  <main
    v-if="!isPageReady"
    style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#475569;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"
  >
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
      <div style="width:38px;height:38px;border:3px solid #cbd5e1;border-top-color:#4f46e5;border-radius:9999px;animation:spin 0.8s linear infinite;" />
      <p style="font-size:14px;">Loading interface...</p>
    </div>
  </main>

  <main v-else class="login-page">
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

    <!-- Animated Background -->
    <div class="bg-animation">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>

    <div class="login-container">
      <!-- Login Card -->
      <div class="login-card">
        <div class="card-header">
          <h1>ยินดีต้อนรับกลับมา</h1>
          <p>เข้าสู่ระบบเพื่อจัดการธุรกิจของคุณ</p>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="email">
              <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              อีเมล
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="your@email.com"
              autocomplete="email"
              :disabled="isLoading"
            >
          </div>

          <div class="form-group">
            <label for="password">
              <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              รหัสผ่าน
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              :disabled="isLoading"
            >
          </div>

          <div class="form-check">
            <input
              id="remember"
              v-model="rememberMe"
              type="checkbox"
            >
            <label for="remember">จดจำฉันไว้</label>
          </div>

          <button type="submit" :disabled="isLoading" class="btn-login">
            <span v-if="!isLoading">เข้าสู่ระบบ</span>
            <span v-else class="btn-loading">
              <svg class="spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
              </svg>
              กำลังเข้าสู่ระบบ...
            </span>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>© 2026 Phakram. สงวนลิขสิทธิ์.</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  33% {
    transform: translateY(-30px) rotate(120deg);
  }
  66% {
    transform: translateY(15px) rotate(240deg);
  }
}

@keyframes glow {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-page {
  height: 100dvh;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  overflow: hidden;
  position: relative;
  padding: clamp(0.5rem, 1.5vh, 1rem);
}

.toast-notification {
  position: fixed;
  top: 24px;
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

/* Animated Background */
.bg-animation {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  animation: float 25s ease-in-out infinite;
}

.shape-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.shape-2 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
  bottom: -150px;
  right: -150px;
  animation-delay: 8s;
}

.shape-3 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #93c5fd, #60a5fa);
  top: 50%;
  left: 50%;
  animation-delay: 16s;
}

.login-container {
  width: 100%;
  max-width: 480px;
  max-height: calc(100dvh - 1rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.login-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: clamp(1.25rem, 2.6vh, 2.5rem);
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  border: 1px solid rgba(255, 255, 255, 0.4);
  position: relative;
  animation: slideIn 0.6s ease-out both;
}

.card-header {
  margin-bottom: clamp(1rem, 2vh, 2rem);
  text-align: center;
}

.card-header h1 {
  font-size: clamp(1.25rem, 3vh, 2rem);
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.625rem;
  letter-spacing: -0.5px;
}

.card-header p {
  color: #64748b;
  font-size: clamp(0.8125rem, 1.5vh, 1rem);
  line-height: 1.5;
}

.form-group {
  margin-bottom: clamp(0.75rem, 1.8vh, 1.25rem);
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: clamp(0.8125rem, 1.4vh, 0.9375rem);
  font-weight: 600;
  color: #475569;
  margin-bottom: clamp(0.375rem, 0.9vh, 0.625rem);
}

.input-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: #3b82f6;
}

.form-group input {
  width: 100%;
  padding: clamp(0.7rem, 1.6vh, 1rem) 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.875rem;
  font-size: clamp(0.875rem, 1.6vh, 1rem);
  color: #0f172a;
  background: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.form-group input::placeholder {
  color: #94a3b8;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.form-group input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
  border-color: #e2e8f0;
  transform: none;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: clamp(0.75rem, 1.8vh, 1.5rem);
}

.form-check input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #3b82f6;
  cursor: pointer;
  border-radius: 0.375rem;
}

.form-check label {
  font-size: 0.9375rem;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

.btn-login {
  width: 100%;
  padding: clamp(0.75rem, 1.8vh, 1rem) 1.125rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-weight: 600;
  font-size: clamp(0.875rem, 1.6vh, 1rem);
  border: none;
  border-radius: 0.875rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  position: relative;
  overflow: hidden;
}

.btn-login::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.btn-login span {
  position: relative;
  z-index: 1;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.5);
}

.btn-login:hover:not(:disabled)::before {
  opacity: 1;
}

.btn-login:active:not(:disabled) {
  transform: translateY(-1px);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
}

.spinner {
  width: 1.25rem;
  height: 1.25rem;
  animation: spin 0.8s linear infinite;
}

.footer {
  text-align: center;
  margin-top: clamp(0.75rem, 1.8vh, 2rem);
  animation: slideIn 0.6s ease-out 0.2s both;
}

.footer p {
  font-size: clamp(0.75rem, 1.4vh, 0.9375rem);
  color: #64748b;
  font-weight: 500;
}

/* Responsive Adjustments */
@media (max-width: 640px) {
  .login-page {
    padding: 1rem;
  }

  .login-card {
    padding: 2rem;
  }

  .card-header h1 {
    font-size: 1.75rem;
  }

  .card-header p {
    font-size: 0.9375rem;
  }

  .form-group input {
    padding: 0.875rem 1rem;
  }

  .btn-login {
    padding: 0.875rem 1rem;
    font-size: 0.9375rem;
  }
}

@media (max-height: 700px) {
  .login-page {
    padding: 0.75rem;
  }

  .login-card {
    padding: 1.75rem;
  }

  .card-header {
    margin-bottom: 1.5rem;
  }

  .card-header h1 {
    font-size: 1.625rem;
  }

  .card-header p {
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .form-group input {
    padding: 0.875rem 1rem;
    font-size: 0.9375rem;
  }

  .form-check {
    margin-bottom: 1.25rem;
  }

  .btn-login {
    padding: 0.875rem 1rem;
    font-size: 0.9375rem;
  }

  .footer {
    margin-top: 1.5rem;
  }

  .footer p {
    font-size: 0.875rem;
  }
}

@media (max-height: 600px) {
  .login-card {
    padding: 1.5rem;
  }

  .card-header {
    margin-bottom: 1.25rem;
  }

  .card-header h1 {
    font-size: 1.375rem;
  }

  .card-header p {
    font-size: 0.8125rem;
  }

  .form-group {
    margin-bottom: 0.875rem;
  }

  .form-group label {
    font-size: 0.8125rem;
  }

  .form-group input {
    padding: 0.75rem 0.875rem;
    font-size: 0.875rem;
  }

  .form-check {
    margin-bottom: 1rem;
  }

  .btn-login {
    padding: 0.75rem 0.875rem;
    font-size: 0.875rem;
  }

  .footer {
    margin-top: 1rem;
  }

  .footer p {
    font-size: 0.8125rem;
  }
}
</style>
