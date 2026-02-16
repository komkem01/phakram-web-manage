<script setup lang="ts">
const isSidebarOpen = ref(false)
const isPageReady = ref(false)
const openDropdowns = ref<string[]>([])
const isLogoutModalOpen = ref(false)
const { logout } = useAdminAuth()
const { profile, fetchProfile } = useProfile()

const displayName = computed(() => {
  if (!profile.value) {
    return 'กำลังโหลด...'
  }

  const fullNameTh = `${profile.value.firstname_th || ''} ${profile.value.lastname_th || ''}`.trim()
  if (fullNameTh) {
    return fullNameTh
  }

  const fullNameEn = `${profile.value.firstname_en || ''} ${profile.value.lastname_en || ''}`.trim()
  if (fullNameEn) {
    return fullNameEn
  }

  return profile.value.email || 'ไม่ระบุชื่อ'
})

const displayRole = computed(() => {
  const role = profile.value?.role?.toLowerCase()
  if (role === 'admin') {
    return 'ผู้ดูแลระบบ'
  }

  return profile.value?.role || 'ไม่ระบุบทบาท'
})

onMounted(() => {
  void fetchProfile()

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

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function toggleDropdown(menuId: string) {
  const index = openDropdowns.value.indexOf(menuId)
  if (index > -1) {
    openDropdowns.value.splice(index, 1)
  } else {
    openDropdowns.value.push(menuId)
  }
}

function isDropdownOpen(menuId: string) {
  return openDropdowns.value.includes(menuId)
}

function openLogoutModal() {
  isLogoutModalOpen.value = true
}

function closeLogoutModal() {
  isLogoutModalOpen.value = false
}

async function handleLogout() {
  isLogoutModalOpen.value = false
  logout()
  await navigateTo('/')
}
</script>

<template>
  <!-- Loading Gate -->
  <div
    v-if="!isPageReady"
    style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#475569;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"
  >
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
      <div style="width:38px;height:38px;border:3px solid #cbd5e1;border-top-color:#4f46e5;border-radius:9999px;animation:spin 0.8s linear infinite;" />
      <p style="font-size:14px;">Loading interface...</p>
    </div>
  </div>

  <!-- Dashboard Layout -->
  <div v-else class="dashboard-layout">
    <!-- Sidebar -->
    <aside
      class="sidebar"
      :class="{ 'sidebar-open': isSidebarOpen }"
    >
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">P</div>
          <span class="sidebar-logo-text">Phakram</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- รายงาน -->
        <NuxtLink to="/dashboard" class="nav-item" @click="isSidebarOpen = false">
          <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>รายงาน</span>
        </NuxtLink>

        <!-- ตั้งค่าพื้นฐาน -->
        <div class="nav-group">
          <button
            class="nav-item nav-dropdown-trigger"
            :class="{ 'is-open': isDropdownOpen('basic-settings') }"
            @click="toggleDropdown('basic-settings')"
          >
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>ตั้งค่าพื้นฐาน</span>
            <svg class="dropdown-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div class="nav-dropdown" :class="{ 'is-open': isDropdownOpen('basic-settings') }">
            <NuxtLink to="/settings/gender" class="nav-subitem" @click="isSidebarOpen = false">
              เพศ
            </NuxtLink>
            <NuxtLink to="/settings/prefix" class="nav-subitem" @click="isSidebarOpen = false">
              คำนำหน้า
            </NuxtLink>
            <NuxtLink to="/settings/province" class="nav-subitem" @click="isSidebarOpen = false">
              จังหวัด
            </NuxtLink>
            <NuxtLink to="/settings/district" class="nav-subitem" @click="isSidebarOpen = false">
              อำเภอ
            </NuxtLink>
            <NuxtLink to="/settings/subdistrict" class="nav-subitem" @click="isSidebarOpen = false">
              ตำบล
            </NuxtLink>
            <NuxtLink to="/settings/postal-code" class="nav-subitem" @click="isSidebarOpen = false">
              เลขไปรษณีย์
            </NuxtLink>
            <NuxtLink to="/settings/status" class="nav-subitem" @click="isSidebarOpen = false">
              สถานะใช้งาน
            </NuxtLink>
            <NuxtLink to="/settings/member-level" class="nav-subitem" @click="isSidebarOpen = false">
              ระดับสมาชิก
            </NuxtLink>
            <NuxtLink to="/settings/bank" class="nav-subitem" @click="isSidebarOpen = false">
              ธนาคาร
            </NuxtLink>
          </div>
        </div>

        <!-- จัดการคำสั่งซื้อ -->
        <div class="nav-group">
          <button
            class="nav-item nav-dropdown-trigger"
            :class="{ 'is-open': isDropdownOpen('orders') }"
            @click="toggleDropdown('orders')"
          >
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>จัดการคำสั่งซื้อ</span>
            <svg class="dropdown-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div class="nav-dropdown" :class="{ 'is-open': isDropdownOpen('orders') }">
            <NuxtLink to="/orders" class="nav-subitem" @click="isSidebarOpen = false">
              หน้าจัดการคำสั่งซื้อ
            </NuxtLink>
          </div>
        </div>

        <!-- จัดการสินค้า -->
        <div class="nav-group">
          <button
            class="nav-item nav-dropdown-trigger"
            :class="{ 'is-open': isDropdownOpen('products') }"
            @click="toggleDropdown('products')"
          >
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>จัดการสินค้า</span>
            <svg class="dropdown-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div class="nav-dropdown" :class="{ 'is-open': isDropdownOpen('products') }">
            <NuxtLink to="/products/categories" class="nav-subitem" @click="isSidebarOpen = false">
              หน้าจัดการหมวดหมู่
            </NuxtLink>
            <NuxtLink to="/products" class="nav-subitem" @click="isSidebarOpen = false">
              หน้าจัดการสินค้า
            </NuxtLink>
          </div>
        </div>

        <!-- จัดการผู้ใช้งาน -->
        <div class="nav-group">
          <button
            class="nav-item nav-dropdown-trigger"
            :class="{ 'is-open': isDropdownOpen('users') }"
            @click="toggleDropdown('users')"
          >
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>จัดการผู้ใช้งาน</span>
            <svg class="dropdown-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div class="nav-dropdown" :class="{ 'is-open': isDropdownOpen('users') }">
            <NuxtLink to="/users/admins" class="nav-subitem" @click="isSidebarOpen = false">
              หน้าจัดการผู้ดูแลระบบ
            </NuxtLink>
            <NuxtLink to="/users/customers" class="nav-subitem" @click="isSidebarOpen = false">
              หน้าจัดการลูกค้า
            </NuxtLink>
          </div>
        </div>

        <!-- ตั้งค่าข้อมูลส่วนตัว -->
        <NuxtLink to="/profile" class="nav-item" @click="isSidebarOpen = false">
          <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>ตั้งค่าข้อมูลส่วนตัว</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-button" @click="openLogoutModal">
          <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <!-- Overlay for mobile -->
    <div
      v-if="isSidebarOpen"
      class="sidebar-overlay"
      @click="toggleSidebar"
    />

    <!-- Main Content -->
    <div class="main-layout">
      <!-- Top Header -->
      <header class="top-header">
        <button
          class="menu-button"
          @click="toggleSidebar"
        >
          <svg class="menu-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="header-actions">
          <div class="user-meta">
            <p class="user-name">{{ displayName }}</p>
            <p class="user-role">{{ displayRole }}</p>
          </div>

          <button class="user-button">
            <svg class="user-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="main-content">
        <slot />
      </main>
    </div>

    <div
      v-if="isLogoutModalOpen"
      class="logout-modal-overlay"
      @click="closeLogoutModal"
    >
      <div class="logout-modal" @click.stop>
        <h3 class="logout-modal-title">ยืนยันการออกจากระบบ</h3>
        <p class="logout-modal-text">คุณต้องการออกจากระบบใช่หรือไม่?</p>
        <div class="logout-modal-actions">
          <button class="modal-cancel-button" @click="closeLogoutModal">ยกเลิก</button>
          <button class="modal-confirm-button" @click="handleLogout">ออกจากระบบ</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-layout {
  display: flex;
  height: 100vh;
  background: #f8fafc;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  background: white;
  border-right: 1px solid #e2e8f0;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 40;
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .sidebar {
    transform: translateX(0);
  }
}

.sidebar-open {
  transform: translateX(0);
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
}

.sidebar-logo-text {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.sidebar-nav {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
}

.nav-group {
  margin-bottom: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 0 8px 4px 8px;
  border-radius: 8px;
  color: #64748b;
  text-decoration: none;
  transition: all 0.2s;
  font-size: 15px;
  font-weight: 500;
  border: none;
  background: none;
  width: calc(100% - 16px);
  box-sizing: border-box;
  cursor: pointer;
  position: relative;
}

.nav-item:hover {
  background: #f1f5f9;
  color: #475569;
}

.nav-item.router-link-active {
  background: #eef2ff;
  color: #4f46e5;
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: none;
  width: 100%;
  background: #fef2f2;
  color: #dc2626;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.nav-dropdown-trigger {
  justify-content: space-between;
}

.nav-dropdown-trigger.is-open {
  color: #475569;
  background: #f1f5f9;
}

.nav-dropdown-trigger.is-open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: auto;
  transition: transform 0.2s;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-dropdown {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out, opacity 0.2s ease-out;
  opacity: 0;
}

.nav-dropdown.is-open {
  max-height: 1000px;
  opacity: 1;
  transition: max-height 0.4s ease-in, opacity 0.3s ease-in;
}

.nav-subitem {
  display: block;
  padding: 10px 16px 10px 48px;
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  margin-bottom: 2px;
  transition: all 0.2s;
}

.nav-subitem:hover {
  background: #f1f5f9;
  color: #475569;
  padding-left: 52px;
}

.nav-subitem.router-link-active {
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 600;
}

/* Sidebar Overlay */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 30;
}

@media (min-width: 1024px) {
  .sidebar-overlay {
    display: none;
  }
}

/* Main Layout */
.main-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .main-layout {
    margin-left: 280px;
  }
}

/* Top Header */
.top-header {
  position: sticky;
  top: 0;
  height: 64px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 10;
}

.menu-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: #475569;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.menu-button:hover {
  background: #f1f5f9;
}

@media (min-width: 1024px) {
  .menu-button {
    display: none;
  }
}

.menu-icon {
  width: 24px;
  height: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.user-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.2;
}

.user-role {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.2;
}

.user-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  border-radius: 9999px;
  transition: all 0.2s;
}

.user-button:hover {
  background: #e2e8f0;
}

.user-icon {
  width: 20px;
  height: 20px;
}

.logout-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.logout-modal {
  width: 100%;
  max-width: 360px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
}

.logout-modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.logout-modal-text {
  margin: 8px 0 0;
  font-size: 14px;
  color: #64748b;
}

.logout-modal-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-cancel-button,
.modal-confirm-button {
  border: none;
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-cancel-button {
  background: #f1f5f9;
  color: #475569;
}

.modal-cancel-button:hover {
  background: #e2e8f0;
}

.modal-confirm-button {
  background: #dc2626;
  color: #ffffff;
}

.modal-confirm-button:hover {
  background: #b91c1c;
}

/* Main Content */
.main-content {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
}

@media (min-width: 768px) {
  .main-content {
    padding: 32px;
  }
}

@media (min-width: 1440px) {
  .main-content {
    padding: 40px;
  }
}
</style>
