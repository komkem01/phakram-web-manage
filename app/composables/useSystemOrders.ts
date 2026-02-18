import type { ApiPaginate, ApiResponse, BankItem, MemberBankItem, Order, OrderItem, OrderListParams, OrderPaymentDetail, OrderTimelineItem, ProductItem, StorageFileItem, SystemPaymentItem } from '~/types/settings'
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

  function getAuthHeaders() {
    if (!process.client) {
      return {
        'ngrok-skip-browser-warning': 'true'
      }
    }

    const token = localStorage.getItem('access_token')
    const tokenType = localStorage.getItem('token_type') || 'Bearer'
    const authorization = token ? `${tokenType} ${token}` : ''

    return {
      'ngrok-skip-browser-warning': 'true',
      ...(authorization ? { Authorization: authorization } : {})
    }
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
        headers: getAuthHeaders()
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
        headers: getAuthHeaders()
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

  function buildPaymentPath(id: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.payments
    return `${apiBaseUrl}${endpoint}/${id}`
  }

  function buildProductInfoPath(id: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.products
    return `${apiBaseUrl}${endpoint}/${id}`
  }

  function buildStorageListUrl(refID: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const url = new URL(`${apiBaseUrl}/auth/storages/`)
    url.searchParams.set('ref_id', refID)
    return url.toString()
  }

  function buildMemberBanksPath(memberID: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.members
    return `${apiBaseUrl}${endpoint}/${memberID}/banks/`
  }

  function buildBankInfoPath(bankID: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.banks
    return `${apiBaseUrl}${endpoint}/${bankID}`
  }

  async function enrichOrderItemsWithProductNames(items: OrderItem[]) {
    const productIDs = [...new Set(items.map((item) => String(item.product_id || '').trim()).filter(Boolean))]
    if (productIDs.length === 0) return items

    const productNameMap: Record<string, { name_th?: string, name_en?: string }> = {}

    const entries = await Promise.all(productIDs.map(async (productID) => {
      try {
        const response = await fetchWithAuthRetry<ApiResponse<ProductItem>>(buildProductInfoPath(productID), { method: 'GET' })
        if (!isSuccessCode(response.code) || !response.data) return [productID, null] as const
        return [productID, response.data] as const
      } catch {
        return [productID, null] as const
      }
    }))

    for (const [productID, product] of entries) {
      if (!product) continue
      productNameMap[productID] = {
        name_th: String(product.name_th || '').trim(),
        name_en: String(product.name_en || '').trim()
      }
    }

    return items.map((item) => {
      const productInfo = productNameMap[String(item.product_id || '').trim()]
      return {
        ...item,
        product_name_th: productInfo?.name_th || '',
        product_name_en: productInfo?.name_en || ''
      }
    })
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

      const enrichedItems = await enrichOrderItemsWithProductNames(response.data || [])
      orderItems.value = enrichedItems
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

  async function fetchOrderItemsByOrderId(id: string, page = 1, size = 200) {
    errorMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<OrderItem[]>>(buildItemsPath(id, page, size), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)
      return await enrichOrderItemsWithProductNames(response.data || [])
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, SETTINGS_CONFIG.messages.loadError)
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, SETTINGS_CONFIG.messages.loadError)
      }
      return []
    }
  }

  async function fetchOrderPaymentDetail(order: Order): Promise<OrderPaymentDetail> {
    const paymentID = String(order.payment_id || '').trim()
    if (!paymentID) {
      return { payment: null, slips: [] }
    }

    let payment: SystemPaymentItem | null = null
    let slips: StorageFileItem[] = []

    try {
      const paymentResponse = await fetchWithAuthRetry<ApiResponse<SystemPaymentItem>>(buildPaymentPath(paymentID), { method: 'GET' })
      payment = (isSuccessCode(paymentResponse.code) ? paymentResponse.data : null) || null
    } catch {
      payment = null
    }

    try {
      const storageResponse = await fetchWithAuthRetry<ApiResponse<StorageFileItem[]>>(buildStorageListUrl(paymentID), { method: 'GET' })
      slips = isSuccessCode(storageResponse.code)
        ? (storageResponse.data || []).filter((item) => String(item.related_entity || '').toUpperCase() === 'PAYMENT_FILE')
        : []
    } catch {
      slips = []
    }

    return { payment, slips }
  }

  async function fetchMemberBanks(memberID: string) {
    const normalizedMemberID = String(memberID || '').trim()
    if (!normalizedMemberID) return [] as MemberBankItem[]

    try {
      const response = await fetchWithAuthRetry<ApiResponse<MemberBankItem[]>>(`${buildMemberBanksPath(normalizedMemberID)}?page=1&size=100`, {
        method: 'GET'
      })
      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)
      }

      const banks = (response.data || []).map((item) => ({
        ...item,
        bank_name_th: '',
        bank_name_en: ''
      }))

      const bankIDs = [...new Set(banks.map((item) => String(item.bank_id || '').trim()).filter(Boolean))]
      if (bankIDs.length === 0) {
        return banks.sort((left, right) => Number(right.is_default) - Number(left.is_default))
      }

      const bankEntries = await Promise.all(bankIDs.map(async (bankID) => {
        try {
          const bankResponse = await fetchWithAuthRetry<ApiResponse<BankItem>>(buildBankInfoPath(bankID), { method: 'GET' })
          if (!isSuccessCode(bankResponse.code) || !bankResponse.data) return [bankID, null] as const
          return [bankID, bankResponse.data] as const
        } catch {
          return [bankID, null] as const
        }
      }))

      const bankMap: Record<string, BankItem> = {}
      for (const [bankID, bank] of bankEntries) {
        if (!bank) continue
        bankMap[bankID] = bank
      }

      return banks
        .map((item) => {
          const bank = bankMap[String(item.bank_id || '').trim()]
          return {
            ...item,
            bank_name_th: String(bank?.name_th || '').trim(),
            bank_name_en: String(bank?.name_en || '').trim()
          }
        })
        .sort((left, right) => Number(right.is_default) - Number(left.is_default))
    } catch {
      return [] as MemberBankItem[]
    }
  }

  async function updateOrderStatus(order: Order, status: string, shippingTrackingNo?: string, options?: { cancelReason?: string, refundReason?: string }) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const payload = {
        member_id: order.member_id,
        payment_id: order.payment_id,
        address_id: order.address_id,
        status,
        shipping_tracking_no: String(shippingTrackingNo || ''),
        cancel_reason: String(options?.cancelReason || ''),
        refund_reason: String(options?.refundReason || ''),
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

  async function approveOrderPayment(id: string) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(`${buildInfoPath(id)}/payment/approve`, {
        method: 'PATCH'
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.updateError)
      }

      successMessage.value = response.message || 'อนุมัติการชำระเงินสำเร็จ'
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, 'ไม่สามารถอนุมัติการชำระเงินได้')
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, 'ไม่สามารถอนุมัติการชำระเงินได้')
      }
      return false
    }
  }

  async function rejectOrderPayment(id: string, reason: string) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(`${buildInfoPath(id)}/payment/reject`, {
        method: 'PATCH',
        body: { reason }
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.updateError)
      }

      successMessage.value = response.message || 'ไม่อนุมัติการชำระเงินแล้ว'
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = normalizeOrderErrorMessage(fetchError.data?.message || fetchError.message, 'ไม่สามารถไม่อนุมัติการชำระเงินได้')
      } else {
        errorMessage.value = normalizeOrderErrorMessage(error instanceof Error ? error.message : undefined, 'ไม่สามารถไม่อนุมัติการชำระเงินได้')
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
    fetchOrderItemsByOrderId,
    fetchOrderTimeline,
    fetchOrderPaymentDetail,
    fetchMemberBanks,
    updateOrderStatus,
    approveOrderPayment,
    rejectOrderPayment
  }
}
