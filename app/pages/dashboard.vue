<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

// Sample data - replace with real API calls later
const statsCards = ref([
  {
    id: 1,
    title: 'ยอดขายวันนี้',
    value: '฿12,450',
    change: '+12.5%',
    trend: 'up',
    icon: 'chart'
  },
  {
    id: 2,
    title: 'คำสั่งซื้อใหม่',
    value: '24',
    change: '+8.2%',
    trend: 'up',
    icon: 'orders'
  },
  {
    id: 3,
    title: 'ลูกค้าทั้งหมด',
    value: '1,842',
    change: '+3.1%',
    trend: 'up',
    icon: 'users'
  },
  {
    id: 4,
    title: 'สินค้าคงเหลือ',
    value: '342',
    change: '-2.4%',
    trend: 'down',
    icon: 'inventory'
  }
])
</script>

<template>
  <div class="dashboard-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">รายงาน</h1>
        <p class="page-subtitle">ภาพรวมข้อมูลธุรกิจของคุณ</p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div
        v-for="stat in statsCards"
        :key="stat.id"
        class="stat-card"
      >
        <div class="stat-header">
          <div class="stat-icon" :class="`stat-icon-${stat.icon}`">
            <!-- Chart Icon -->
            <svg v-if="stat.icon === 'chart'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <!-- Orders Icon -->
            <svg v-if="stat.icon === 'orders'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <!-- Users Icon -->
            <svg v-if="stat.icon === 'users'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <!-- Inventory Icon -->
            <svg v-if="stat.icon === 'inventory'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span class="stat-change" :class="`stat-change-${stat.trend}`">
            {{ stat.change }}
          </span>
        </div>
        <div class="stat-content">
          <p class="stat-label">{{ stat.title }}</p>
          <p class="stat-value">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- Recent Activity Placeholder -->
    <div class="content-section">
      <div class="section-header">
        <h2 class="section-title">กิจกรรมล่าสุด</h2>
      </div>
      <div class="placeholder-box">
        <svg class="placeholder-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="placeholder-text">ข้อมูลจะแสดงที่นี่</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* Page Header */
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 32px;
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
}

.stat-icon-chart {
  background: #eef2ff;
  color: #4f46e5;
}

.stat-icon-orders {
  background: #ecfdf5;
  color: #10b981;
}

.stat-icon-users {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-icon-inventory {
  background: #fce7f3;
  color: #ec4899;
}

.stat-change {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

.stat-change-up {
  background: #ecfdf5;
  color: #10b981;
}

.stat-change-down {
  background: #fef2f2;
  color: #ef4444;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

/* Content Section */
.content-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e2e8f0;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

/* Placeholder */
.placeholder-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  color: #cbd5e1;
  margin-bottom: 12px;
}

.placeholder-text {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .page-title {
    font-size: 32px;
  }
  
  .page-subtitle {
    font-size: 15px;
  }
}
</style>
