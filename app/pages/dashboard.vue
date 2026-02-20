<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const dailyOrdersApi = useSystemOrders()
const weeklyOrdersApi = useSystemOrders()
const allOrdersApi = useSystemOrders()
const topRangeOrdersApi = useSystemOrders()
const orderItemsApi = useSystemOrders()
const usersApi = useSystemUsers()
const productsApi = useSystemProducts()
const productCatalogApi = useSystemProducts()
const { toShortCode } = useShortCode()

const isLoading = ref(false)
const isTopProductsLoading = ref(false)
const isTopSectionLoading = ref(false)
const topRange = ref<'all' | 'today' | '7d' | '30d'>('7d')
const topProductsToday = ref<Array<{ productId: string, productName: string, productNo: string, quantity: number, amount: number }>>([])
const newOrderHours = 24

function formatMoney(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPercent(value: number) {
  return `${value.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function startOfTodayUnix() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  return Math.floor(start.getTime() / 1000)
}

function endOfTodayUnix() {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return Math.floor(end.getTime() / 1000)
}

function startOfDaysAgoUnix(daysAgo: number) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 0, 0, 0)
  return Math.floor(target.getTime() / 1000)
}

function getDateKey(dateText: string) {
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const ordersToday = computed(() => dailyOrdersApi.orders.value)
const ordersTodayCount = computed(() => Number(dailyOrdersApi.paginate.value.total || 0))

const salesToday = computed(() => {
  return ordersToday.value.reduce((sum, order) => {
    const amount = Number(order.net_amount)
    return Number.isNaN(amount) ? sum : sum + amount
  }, 0)
})

const avgOrderValueToday = computed(() => {
  if (!ordersTodayCount.value) return 0
  return salesToday.value / ordersTodayCount.value
})

const completedTodayCount = computed(() => ordersToday.value.filter((item) => item.status === 'completed').length)
const cancelledTodayCount = computed(() => ordersToday.value.filter((item) => item.status === 'cancelled').length)
const paidFlowTodayCount = computed(() => ordersToday.value.filter((item) => ['paid', 'shipping', 'completed'].includes(String(item.status))).length)

const paidFlowRateToday = computed(() => {
  if (!ordersTodayCount.value) return 0
  return (paidFlowTodayCount.value / ordersTodayCount.value) * 100
})

const cancellationRateToday = computed(() => {
  if (!ordersTodayCount.value) return 0
  return (cancelledTodayCount.value / ordersTodayCount.value) * 100
})

const statusBreakdown = computed(() => {
  const rows = [
    { key: 'pending', label: 'รอดำเนินการ', count: 0 },
    { key: 'paid', label: 'ชำระเงินแล้ว', count: 0 },
    { key: 'shipping', label: 'กำลังจัดส่ง', count: 0 },
    { key: 'completed', label: 'สำเร็จ', count: 0 },
    { key: 'cancelled', label: 'ยกเลิก', count: 0 }
  ]

  for (const order of ordersToday.value) {
    const row = rows.find((item) => item.key === String(order.status))
    if (row) row.count += 1
  }

  const maxCount = Math.max(...rows.map((item) => item.count), 1)
  return rows.map((item) => ({
    ...item,
    width: (item.count / maxCount) * 100
  }))
})

const weeklyRevenue = computed(() => {
  const map = new Map<string, number>()

  for (const order of weeklyOrdersApi.orders.value) {
    const key = getDateKey(order.created_at)
    if (!key) continue

    const amount = Number(order.net_amount)
    const current = map.get(key) || 0
    map.set(key, Number.isNaN(amount) ? current : current + amount)
  }

  const rows: Array<{ key: string, label: string, amount: number }> = []
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - index)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const key = `${year}-${month}-${day}`

    rows.push({
      key,
      label: date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }),
      amount: map.get(key) || 0
    })
  }

  const maxAmount = Math.max(...rows.map((item) => item.amount), 1)
  return rows.map((item) => ({
    ...item,
    width: (item.amount / maxAmount) * 100
  }))
})

const statsCards = computed(() => ([
  {
    id: 1,
    title: 'ยอดขายวันนี้',
    value: `฿${formatMoney(salesToday.value)}`,
    subtitle: 'คำนวณจากยอดสุทธิคำสั่งซื้อวันนี้',
    icon: 'chart'
  },
  {
    id: 2,
    title: 'คำสั่งซื้อวันนี้',
    value: String(ordersTodayCount.value),
    subtitle: 'จำนวนคำสั่งซื้อที่สร้างวันนี้',
    icon: 'orders'
  },
  {
    id: 3,
    title: 'ลูกค้าทั้งหมด',
    value: String(usersApi.paginate.value.total || 0),
    subtitle: 'ผู้ใช้งาน role customer ทั้งหมด',
    icon: 'users'
  },
  {
    id: 4,
    title: 'สินค้าทั้งหมด',
    value: String(productsApi.paginate.value.total || 0),
    subtitle: 'จำนวนรายการสินค้าในระบบ',
    icon: 'inventory'
  }
]))

const insightCards = computed(() => ([
  {
    id: 1,
    title: 'ค่าเฉลี่ยต่อคำสั่งซื้อ (วันนี้)',
    value: `฿${formatMoney(avgOrderValueToday.value)}`
  },
  {
    id: 2,
    title: 'อัตราไปสู่ขั้นชำระเงิน/จัดส่ง/สำเร็จ',
    value: formatPercent(paidFlowRateToday.value)
  },
  {
    id: 3,
    title: 'คำสั่งซื้อสำเร็จวันนี้',
    value: String(completedTodayCount.value)
  },
  {
    id: 4,
    title: 'อัตราการยกเลิกวันนี้',
    value: formatPercent(cancellationRateToday.value)
  }
]))

const recentOrders = computed(() => allOrdersApi.orders.value.slice(0, 5))

const adminNotificationCounts = computed(() => {
  const now = Date.now()
  const newOrderCount = allOrdersApi.orders.value.filter((order) => {
    const createdAtTime = new Date(order.created_at).getTime()
    if (Number.isNaN(createdAtTime)) return false
    const diffHours = (now - createdAtTime) / (1000 * 60 * 60)
    return diffHours >= 0 && diffHours <= newOrderHours
  }).length

  const cancelledCount = allOrdersApi.orders.value.filter((order) => String(order.status) === 'cancelled').length
  const waitingReviewCount = allOrdersApi.orders.value.filter((order) => String(order.status) === 'pending' && Boolean(order.payment_submitted)).length

  return {
    newOrderCount,
    cancelledCount,
    waitingReviewCount,
    total: newOrderCount + cancelledCount + waitingReviewCount
  }
})

const orderStatusSummary = computed(() => {
  const rows = [
    { status: 'pending', label: 'รอดำเนินการ', count: 0 },
    { status: 'paid', label: 'ชำระแล้ว', count: 0 },
    { status: 'shipping', label: 'กำลังจัดส่ง', count: 0 },
    { status: 'completed', label: 'สำเร็จ', count: 0 },
    { status: 'cancelled', label: 'ยกเลิก', count: 0 },
    { status: 'refund_requested', label: 'คำขอคืนเงิน', count: 0 }
  ]

  for (const order of allOrdersApi.orders.value) {
    const row = rows.find((item) => item.status === String(order.status))
    if (row) row.count += 1
  }

  return rows.filter((item) => item.count > 0)
})

function formatOrderStatus(status: string) {
  if (status === 'pending') return 'รอดำเนินการ'
  if (status === 'paid') return 'ชำระแล้ว'
  if (status === 'shipping') return 'กำลังจัดส่ง'
  if (status === 'completed') return 'สำเร็จ'
  if (status === 'cancelled') return 'ยกเลิก'
  if (status === 'refund_requested') return 'คำขอคืนเงิน'
  return status || '-'
}

function orderStatusClass(status: string) {
  if (status === 'cancelled') return 'alert-status-cancelled'
  if (status === 'pending') return 'alert-status-pending'
  if (status === 'paid') return 'alert-status-paid'
  if (status === 'shipping') return 'alert-status-shipping'
  if (status === 'completed') return 'alert-status-completed'
  if (status === 'refund_requested') return 'alert-status-refund'
  return 'alert-status-default'
}

const topRangeLabel = computed(() => {
  if (topRange.value === 'today') return 'วันนี้'
  if (topRange.value === '7d') return '7 วัน'
  if (topRange.value === '30d') return '30 วัน'
  return 'ทั้งหมด'
})

const topCustomers = computed(() => {
  const map = new Map<string, { memberId: string, orders: number, amount: number }>()

  for (const order of topRangeOrdersApi.orders.value) {
    const memberId = String(order.member_id || '')
    if (!memberId) continue

    const row = map.get(memberId) || { memberId, orders: 0, amount: 0 }
    row.orders += 1
    const amount = Number(order.net_amount)
    row.amount += Number.isNaN(amount) ? 0 : amount
    map.set(memberId, row)
  }

  return Array.from(map.values())
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5)
})

const productMap = computed(() => {
  const map = new Map<string, { name: string, no: string }>()
  for (const product of productCatalogApi.products.value) {
    map.set(product.id, {
      name: product.name_th || product.name_en || '-',
      no: product.product_no || '-'
    })
  }
  return map
})

function customerReference(memberId: string) {
  return toShortCode(memberId, 'MEM')
}

function buildTopRangeOrdersParams(range: 'all' | 'today' | '7d' | '30d') {
  const params: Record<string, unknown> = {
    page: 1,
    size: 2000,
    sort_by: 'created_at',
    order_by: 'desc'
  }

  if (range === 'today') {
    params.start_date = startOfTodayUnix()
    params.end_date = endOfTodayUnix()
  } else if (range === '7d') {
    params.start_date = startOfDaysAgoUnix(6)
    params.end_date = endOfTodayUnix()
  } else if (range === '30d') {
    params.start_date = startOfDaysAgoUnix(29)
    params.end_date = endOfTodayUnix()
  }

  return params
}

async function loadTopProducts() {
  isTopProductsLoading.value = true

  const aggregate = new Map<string, { quantity: number, amount: number }>()
  const orderIds = topRangeOrdersApi.orders.value.map((order) => order.id)

  const itemLists = await Promise.all(orderIds.map((orderId) => orderItemsApi.fetchOrderItemsByOrderId(orderId, 1, 500)))
  for (const items of itemLists) {
    for (const item of items) {
      const productId = String(item.product_id || '')
      if (!productId) continue

      const row = aggregate.get(productId) || { quantity: 0, amount: 0 }
      row.quantity += Number(item.quantity || 0)
      const amount = Number(item.total_item_amount)
      row.amount += Number.isNaN(amount) ? 0 : amount
      aggregate.set(productId, row)
    }
  }

  topProductsToday.value = Array.from(aggregate.entries())
    .map(([productId, value]) => ({
      productId,
      productName: productMap.value.get(productId)?.name || productId,
      productNo: productMap.value.get(productId)?.no || '-',
      quantity: value.quantity,
      amount: value.amount
    }))
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5)

  isTopProductsLoading.value = false
}

async function loadTopSection() {
  isTopSectionLoading.value = true
  await topRangeOrdersApi.fetchOrders(buildTopRangeOrdersParams(topRange.value))
  await loadTopProducts()
  isTopSectionLoading.value = false
}

async function refreshTopSection() {
  await loadTopSection()
}

async function loadDashboard() {
  isLoading.value = true
  try {
    await Promise.all([
      dailyOrdersApi.fetchOrders({
        page: 1,
        size: 1000,
        sort_by: 'created_at',
        order_by: 'desc',
        start_date: startOfTodayUnix(),
        end_date: endOfTodayUnix()
      }),
      weeklyOrdersApi.fetchOrders({
        page: 1,
        size: 2000,
        sort_by: 'created_at',
        order_by: 'desc',
        start_date: startOfDaysAgoUnix(6),
        end_date: endOfTodayUnix()
      }),
      allOrdersApi.fetchOrders({ page: 1, size: 200, sort_by: 'created_at', order_by: 'desc' }),
      usersApi.fetchUsers({ page: 1, size: 1, role: 'customer', sort_by: 'created_at', order_by: 'desc' }),
      productsApi.fetchProducts({ page: 1, size: 1, sort_by: 'created_at', order_by: 'desc' }),
      productCatalogApi.fetchProducts({ page: 1, size: 3000, sort_by: 'created_at', order_by: 'desc' })
    ])
  } finally {
    isLoading.value = false
  }

  await loadTopSection()
}

watch(topRange, async () => {
  await loadTopSection()
})

onMounted(async () => {
  await loadDashboard()
})
</script>

<template>
  <div class="dashboard-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">รายงาน</h1>
        <p class="page-subtitle">ภาพรวมข้อมูลธุรกิจของคุณ</p>
      </div>
    </div>

    <div class="stats-grid">
      <div
        v-for="stat in statsCards"
        :key="stat.id"
        class="stat-card"
      >
        <div class="stat-header">
          <div class="stat-icon" :class="`stat-icon-${stat.icon}`">
            <svg v-if="stat.icon === 'chart'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <svg v-if="stat.icon === 'orders'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <svg v-if="stat.icon === 'users'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-if="stat.icon === 'inventory'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
        <div class="stat-content">
          <p class="stat-label">{{ stat.title }}</p>
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-subtitle">{{ stat.subtitle }}</p>
        </div>
      </div>
    </div>

    <div class="insight-grid">
      <div v-for="item in insightCards" :key="item.id" class="insight-card">
        <p class="insight-label">{{ item.title }}</p>
        <p class="insight-value">{{ item.value }}</p>
      </div>
    </div>

    <div class="analysis-grid">
      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title">แจ้งเตือนผู้ดูแลระบบ</h2>
          <NuxtLink class="alert-link-all" to="/orders">ดูทั้งหมด</NuxtLink>
        </div>

        <div class="admin-alert-grid">
          <NuxtLink class="admin-alert-card alert-card-new" to="/orders">
            <p class="admin-alert-title">คำสั่งซื้อใหม่ ({{ newOrderHours }} ชม.)</p>
            <p class="admin-alert-value">{{ adminNotificationCounts.newOrderCount }}</p>
          </NuxtLink>
          <NuxtLink class="admin-alert-card alert-card-review" to="/orders?status=pending">
            <p class="admin-alert-title">ชำระแล้วรอตรวจ</p>
            <p class="admin-alert-value">{{ adminNotificationCounts.waitingReviewCount }}</p>
          </NuxtLink>
          <NuxtLink class="admin-alert-card alert-card-cancelled" to="/orders?status=cancelled">
            <p class="admin-alert-title">คำสั่งซื้อยกเลิก</p>
            <p class="admin-alert-value">{{ adminNotificationCounts.cancelledCount }}</p>
          </NuxtLink>
        </div>

        <div v-if="allOrdersApi.isLoading.value" class="placeholder-box">
          <p class="placeholder-text">กำลังโหลดการแจ้งเตือน...</p>
        </div>
        <div v-else-if="recentOrders.length === 0" class="placeholder-box">
          <p class="placeholder-text">ยังไม่มีการแจ้งเตือนคำสั่งซื้อ</p>
        </div>
        <div v-else class="alert-list">
          <NuxtLink v-for="order in recentOrders" :key="order.id" class="alert-item" :to="`/orders/${order.id}`">
            <div>
              <p class="alert-order-no">{{ order.order_no }}</p>
              <p class="alert-order-time">{{ new Date(order.created_at).toLocaleString('th-TH') }}</p>
            </div>
            <div class="alert-right">
              <span class="alert-status" :class="orderStatusClass(String(order.status))">{{ formatOrderStatus(String(order.status)) }}</span>
              <p class="alert-order-amount">฿{{ formatMoney(Number(order.net_amount || 0)) }}</p>
            </div>
          </NuxtLink>
        </div>

        <div v-if="orderStatusSummary.length" class="alert-status-summary">
          <span v-for="item in orderStatusSummary" :key="item.status" class="alert-summary-pill">
            {{ item.label }} {{ item.count }}
          </span>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title">สัดส่วนสถานะคำสั่งซื้อวันนี้</h2>
        </div>
        <div class="status-list">
          <div v-for="item in statusBreakdown" :key="item.key" class="status-row">
            <div class="status-head">
              <span>{{ item.label }}</span>
              <span>{{ item.count }}</span>
            </div>
            <div class="status-bar-bg">
              <div class="status-bar-fill" :style="{ width: `${item.width}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title">ยอดขายย้อนหลัง 7 วัน</h2>
        </div>
        <div class="status-list">
          <div v-for="item in weeklyRevenue" :key="item.key" class="status-row">
            <div class="status-head">
              <span>{{ item.label }}</span>
              <span>฿{{ formatMoney(item.amount) }}</span>
            </div>
            <div class="status-bar-bg">
              <div class="status-bar-fill status-bar-fill-alt" :style="{ width: `${item.width}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title">กิจกรรมล่าสุด</h2>
        </div>
        <div v-if="isLoading" class="placeholder-box">
          <p class="placeholder-text">กำลังโหลดข้อมูล...</p>
        </div>
        <div v-else-if="recentOrders.length === 0" class="placeholder-box">
          <p class="placeholder-text">ยังไม่มีคำสั่งซื้อล่าสุด</p>
        </div>
        <div v-else class="recent-list">
          <NuxtLink v-for="order in recentOrders" :key="order.id" class="recent-item" :to="`/orders/${order.id}`">
            <div>
              <p class="recent-no">{{ order.order_no }}</p>
              <p class="recent-date">{{ new Date(order.created_at).toLocaleString('th-TH') }}</p>
            </div>
            <p class="recent-amount">฿{{ Number(order.net_amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="analysis-grid">
      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title">Top ลูกค้า {{ topRangeLabel }}</h2>
          <div class="top-controls">
            <label class="top-range-filter">
              <span>ช่วงเวลา</span>
              <select v-model="topRange" :disabled="isTopSectionLoading || isTopProductsLoading">
                <option value="today">วันนี้</option>
                <option value="7d">7 วันล่าสุด</option>
                <option value="30d">30 วันล่าสุด</option>
                <option value="all">ทั้งหมด</option>
              </select>
            </label>
            <button class="btn-top-refresh" :disabled="isTopSectionLoading || isTopProductsLoading" @click="refreshTopSection">รีเฟรช</button>
          </div>
        </div>
        <div v-if="isTopSectionLoading" class="placeholder-box">
          <p class="placeholder-text">กำลังโหลดข้อมูลลูกค้า...</p>
        </div>
        <div v-else-if="topCustomers.length === 0" class="placeholder-box">
          <p class="placeholder-text">ยังไม่มีข้อมูลลูกค้าในช่วงที่เลือก</p>
        </div>
        <div v-else class="status-list">
          <div v-for="(item, index) in topCustomers" :key="item.memberId" class="recent-item">
            <div>
              <p class="recent-no">#{{ index + 1 }} · {{ customerReference(item.memberId) }}</p>
              <p class="recent-date">จำนวนออเดอร์ {{ item.orders }} รายการ</p>
            </div>
            <p class="recent-amount">฿{{ formatMoney(item.amount) }}</p>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title">Top สินค้าที่ขาย {{ topRangeLabel }}</h2>
        </div>
        <div v-if="isTopSectionLoading || isTopProductsLoading" class="placeholder-box">
          <p class="placeholder-text">กำลังโหลดข้อมูลสินค้า...</p>
        </div>
        <div v-else-if="topProductsToday.length === 0" class="placeholder-box">
          <p class="placeholder-text">ยังไม่มีข้อมูลสินค้าที่ขายในช่วงที่เลือก</p>
        </div>
        <div v-else class="status-list">
          <div v-for="(item, index) in topProductsToday" :key="item.productId" class="recent-item">
            <div>
              <p class="recent-no">#{{ index + 1 }} · {{ item.productName }}</p>
              <p class="recent-date">{{ item.productNo }} · ขาย {{ item.quantity }} ชิ้น</p>
            </div>
            <p class="recent-amount">฿{{ formatMoney(item.amount) }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.dashboard-page { max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }

.stats-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
.insight-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
.analysis-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }

@media (min-width: 640px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .insight-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
  .insight-grid { grid-template-columns: repeat(4, 1fr); }
  .analysis-grid { grid-template-columns: repeat(2, 1fr); }
}

.stat-card,
.insight-card,
.content-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.stat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-icon svg { width: 20px; height: 20px; }
.stat-icon-chart { background: #eef2ff; color: #4f46e5; }
.stat-icon-orders { background: #ecfdf5; color: #10b981; }
.stat-icon-users { background: #fef3c7; color: #f59e0b; }
.stat-icon-inventory { background: #fce7f3; color: #ec4899; }

.stat-content { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 13px; color: #64748b; margin: 0; }
.stat-value { font-size: 26px; font-weight: 700; color: #1e293b; margin: 0; }
.stat-subtitle { font-size: 12px; color: #94a3b8; margin: 0; }

.insight-label { margin: 0 0 6px 0; font-size: 13px; color: #64748b; }
.insight-value { margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; }

.section-header { margin-bottom: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; }
.top-controls { display: inline-flex; align-items: center; gap: 8px; }
.top-range-filter { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; }
.top-range-filter select { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; background: #fff; }
.btn-top-refresh { height: 34px; border: 1px solid #d1d5db; border-radius: 8px; background: #f8fafc; color: #334155; padding: 0 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-top-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
.alert-link-all { color: #1d4ed8; text-decoration: none; font-size: 13px; font-weight: 700; }

.admin-alert-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 12px; }
@media (min-width: 768px) { .admin-alert-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.admin-alert-card { border-radius: 10px; border: 1px solid transparent; padding: 12px; text-decoration: none; }
.admin-alert-title { margin: 0; font-size: 13px; color: #334155; }
.admin-alert-value { margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #0f172a; }
.alert-card-new { background: #eff6ff; border-color: #bfdbfe; }
.alert-card-review { background: #fffbeb; border-color: #fde68a; }
.alert-card-cancelled { background: #fef2f2; border-color: #fecaca; }

.alert-list { display: flex; flex-direction: column; gap: 10px; }
.alert-item { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-decoration: none; background: #f8fafc; }
.alert-order-no { margin: 0; color: #0f172a; font-size: 14px; font-weight: 700; }
.alert-order-time { margin: 4px 0 0; color: #64748b; font-size: 12px; }
.alert-right { display: flex; align-items: flex-end; flex-direction: column; gap: 6px; }
.alert-status { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 700; }
.alert-status-pending { color: #92400e; background: #fef3c7; }
.alert-status-paid { color: #1d4ed8; background: #dbeafe; }
.alert-status-shipping { color: #0f766e; background: #ccfbf1; }
.alert-status-completed { color: #166534; background: #dcfce7; }
.alert-status-cancelled { color: #991b1b; background: #fee2e2; }
.alert-status-refund { color: #6d28d9; background: #ede9fe; }
.alert-status-default { color: #334155; background: #e2e8f0; }
.alert-order-amount { margin: 0; color: #0f766e; font-size: 13px; font-weight: 700; }

.alert-status-summary { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.alert-summary-pill { display: inline-flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 999px; background: #f8fafc; color: #334155; padding: 4px 10px; font-size: 12px; font-weight: 700; }

.status-list { display: flex; flex-direction: column; gap: 12px; }
.status-row { display: flex; flex-direction: column; gap: 6px; }
.status-head { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #334155; }
.status-bar-bg { height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
.status-bar-fill { height: 100%; background: #4f46e5; border-radius: 999px; }
.status-bar-fill-alt { background: #0f766e; }

.placeholder-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; border: 2px dashed #e2e8f0; border-radius: 8px; background: #f8fafc; }
.placeholder-text { font-size: 14px; color: #94a3b8; margin: 0; }

.recent-list { display: flex; flex-direction: column; gap: 10px; }
.recent-item { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-decoration: none; background: #f8fafc; }
.recent-no { margin: 0; color: #0f172a; font-weight: 600; font-size: 14px; }
.recent-date { margin: 4px 0 0 0; color: #64748b; font-size: 12px; }
.recent-amount { margin: 0; color: #0f766e; font-weight: 700; font-size: 14px; }

@media (min-width: 768px) {
  .page-title { font-size: 32px; }
  .page-subtitle { font-size: 15px; }
}
</style>
