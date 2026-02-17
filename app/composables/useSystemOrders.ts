import type { ApiPaginate, ApiResponse, Order, OrderItem, OrderListParams, OrderTimelineItem } from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useSystemOrders() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const isItemsLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const orders = ref<Order[]>([])
  const orderItems = ref<OrderItem[]>([])
  const orderTimeline = ref<OrderTimelineItem[]>([])
  const paginate = ref<ApiPaginate>({ page: 1, size: 10, total: 0 })
  const itemsPaginate = ref<ApiPaginate>({ page: 1, size: 10, total: 0 })

  function isSuccessCode(code: string | number) {
    return code === '200' || code === 200
  }

  function getAuthHeader() {
    if (!process.client) return ''
    const token = localStorage.getItem('access_token')
    const tokenType = localStorage.getItem('token_type') || 'Bearer'
    return token ? `${tokenType} ${token}` : ''
  }

  function isUnauthorizedError(error: unknown) {
    if (!error || typeof error !== 'object') return false

    const statusCode = 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined
    const status = 'status' in error ? (error as { status?: number }).status : undefined
    const dataCode = 'data' in error ? (error as { data?: { code?: string | number } }).data?.code : undefined

    return statusCode === 401 || status === 401 || dataCode === '401' || dataCode === 401
  }

  function normalizeOrderErrorMessage(message: string | undefined, fallback: string) {
    if (!message) return fallback
    const value = message.trim().toLowerCase()
    if (value === 'invalid status transition') return 'ไม่สามารถเปลี่ยนสถานะข้ามขั้นตอนได้'
    if (value === 'invalid order status') return 'สถานะคำสั่งซื้อไม่ถูกต้อง'
    if (value === 'status is required') return 'กรุณาเลือกสถานะคำสั่งซื้อ'
    if (value.startsWith('insufficient stock for product')) return 'สต๊อกสินค้าไม่เพียงพอสำหรับการจัดส่ง'
    return message
  }

  async function fetchWithAuthRetry<T>(requestUrl: string, options: Omit<Parameters<typeof $fetch<T>>[1], 'headers'> = {}) {
    try {
      return await $fetch<T>(requestUrl, {
        ...options,
        headers: {
          Authorization: getAuthHeader()
        }
      })
    } catch (error) {
      if (!isUnauthorizedError(error)) throw error

      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        logout()
        await navigateTo('/')
        throw error
      }

      return await $fetch<T>(requestUrl, {
        ...options,
        headers: {
          Authorization: getAuthHeader()
        }
      })
    }
  }

  function buildListUrl(params: OrderListParams = {}) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.orders
    const url = new URL(`${apiBaseUrl}${endpoint}/`)

    url.searchParams.set('page', String(params.page || 1))
    url.searchParams.set('size', String(params.size || 10))

    if (params.member_id) url.searchParams.set('member_id', params.member_id)
    if (params.search) url.searchParams.set('search', params.search)
    if (params.status) url.searchParams.set('status', params.status)
    if (params.start_date) url.searchParams.set('start_date', String(params.start_date))
    if (params.end_date) url.searchParams.set('end_date', String(params.end_date))
    if (params.sort_by) url.searchParams.set('sort_by', params.sort_by)
    if (params.order_by) url.searchParams.set('order_by', params.order_by)

    return url.toString()
  }

  function buildInfoPath(id: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.orders
    return `${apiBaseUrl}${endpoint}/${id}`
  }

  function buildItemsPath(id: string, page = 1, size = 10) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.orders
    const url = new URL(`${apiBaseUrl}${endpoint}/${id}/items`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('size', String(size))
    return url.toString()
  }

  function buildTimelinePath(id: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.orders
    return `${apiBaseUrl}${endpoint}/${id}/timeline`
  }

  async function fetchOrders(params: OrderListParams = {}) {
    errorMessage.value = ''
    successMessage.value = ''
    isLoading.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<Order[]>>(buildListUrl(params), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)

      orders.value = response.data || []
      paginate.value = response.paginate || { page: 1, size: 10, total: orders.value.length }
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, SETTINGS_CONFIG.messages.loadError)
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, SETTINGS_CONFIG.messages.loadError)
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchOrderById(id: string) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<Order>>(buildInfoPath(id), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)
      return response.data || null
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, SETTINGS_CONFIG.messages.loadError)
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, SETTINGS_CONFIG.messages.loadError)
      }
      return null
    }
  }

  async function fetchOrderItems(id: string, page = 1, size = 10) {
    errorMessage.value = ''
    successMessage.value = ''
    isItemsLoading.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<OrderItem[]>>(buildItemsPath(id, page, size), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)

      orderItems.value = response.data || []
      itemsPaginate.value = response.paginate || { page: 1, size, total: orderItems.value.length }
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, SETTINGS_CONFIG.messages.loadError)
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, SETTINGS_CONFIG.messages.loadError)
      }
      return false
    } finally {
      isItemsLoading.value = false
    }
  }

  async function fetchOrderTimeline(id: string) {
    errorMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<OrderTimelineItem[]>>(buildTimelinePath(id), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)

      orderTimeline.value = response.data || []
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, SETTINGS_CONFIG.messages.loadError)
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, SETTINGS_CONFIG.messages.loadError)
      }
      return false
    }
  }

  async function updateOrderStatus(order: Order, status: string) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const payload = {
        member_id: order.member_id,
        payment_id: order.payment_id,
        address_id: order.address_id,
        status,
        total_amount: String(order.total_amount),
        discount_amount: String(order.discount_amount),
        net_amount: String(order.net_amount)
      }

      const response = await fetchWithAuthRetry<ApiResponse<null>>(buildInfoPath(order.id), {
        method: 'PATCH',
        body: payload
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.updateError)
      }

      successMessage.value = response.message || SETTINGS_CONFIG.messages.updateSuccess
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, SETTINGS_CONFIG.messages.updateError)
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, SETTINGS_CONFIG.messages.updateError)
      }
      return false
    }
  }

  return {
    isLoading,
    isItemsLoading,
    errorMessage,
    successMessage,
    orders,
    orderItems,
    orderTimeline,
    paginate,
    itemsPaginate,
    fetchOrders,
    fetchOrderById,
    fetchOrderItems,
    fetchOrderTimeline,
    updateOrderStatus
  }
}
