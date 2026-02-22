import type { ApiPaginate, ApiResponse, ContactMessageItem, ContactMessageListParams } from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useContactMessages() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const errorMessage = ref('')
  const messages = ref<ContactMessageItem[]>([])
  const paginate = ref<ApiPaginate>({ page: 1, size: 10, total: 0 })
  const unreadCount = useState<number>('contact-messages-unread-count', () => 0)

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
    if (!error || typeof error !== 'object') {
      return false
    }

    const statusCode = 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined
    const status = 'status' in error ? (error as { status?: number }).status : undefined
    const dataCode = 'data' in error ? (error as { data?: { code?: string | number } }).data?.code : undefined

    return statusCode === 401 || status === 401 || dataCode === '401' || dataCode === 401
  }

  async function fetchWithAuthRetry<T>(requestUrl: string, options: Omit<Parameters<typeof $fetch<T>>[1], 'headers'> = {}) {
    try {
      return await $fetch<T>(requestUrl, {
        ...options,
        headers: getAuthHeaders()
      })
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        throw error
      }

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

  function buildListUrl(params: ContactMessageListParams = {}) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.contactMessages
    const url = new URL(`${apiBaseUrl}${endpoint}`)

    url.searchParams.set('page', String(params.page || 1))
    url.searchParams.set('size', String(params.size || 10))

    if (params.sort_by) url.searchParams.set('sort_by', params.sort_by)
    if (params.order_by) url.searchParams.set('order_by', params.order_by)
    if (params.send_status) url.searchParams.set('send_status', params.send_status)
    if (params.read_status) url.searchParams.set('read_status', params.read_status)
    if (params.search) url.searchParams.set('search', params.search)

    return url.toString()
  }

  function buildMessagePath(id: string, action?: 'read' | 'unread') {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.contactMessages
    const suffix = action ? `/${action}` : ''
    return `${apiBaseUrl}${endpoint}/${id}${suffix}`
  }

  function buildUnreadCountUrl() {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.contactMessages
    return `${apiBaseUrl}${endpoint}/unread-count`
  }

  async function fetchMessages(params: ContactMessageListParams = {}) {
    errorMessage.value = ''
    isLoading.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<ContactMessageItem[]>>(buildListUrl(params), {
        method: 'GET'
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || 'ไม่สามารถโหลดข้อความติดต่อได้')
      }

      messages.value = response.data || []
      paginate.value = response.paginate || { page: 1, size: 10, total: messages.value.length }
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || 'ไม่สามารถโหลดข้อความติดต่อได้'
      } else {
        errorMessage.value = error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อความติดต่อได้'
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function markAsRead(id: string, isRead: boolean) {
    errorMessage.value = ''
    try {
      const path = buildMessagePath(id, isRead ? 'read' : 'unread')
      const response = await fetchWithAuthRetry<ApiResponse<null>>(path, {
        method: 'PATCH'
      })
      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || 'อัปเดตสถานะการอ่านไม่สำเร็จ')
      }
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || 'อัปเดตสถานะการอ่านไม่สำเร็จ'
      } else {
        errorMessage.value = error instanceof Error ? error.message : 'อัปเดตสถานะการอ่านไม่สำเร็จ'
      }
      return false
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await fetchWithAuthRetry<ApiResponse<{ unread: number }>>(buildUnreadCountUrl(), {
        method: 'GET'
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || 'ไม่สามารถโหลดจำนวนข้อความที่ยังไม่อ่านได้')
      }

      unreadCount.value = Number(response.data?.unread || 0)
      return true
    } catch {
      return false
    }
  }

  return {
    isLoading,
    errorMessage,
    messages,
    paginate,
    unreadCount,
    fetchMessages,
    markAsRead,
    fetchUnreadCount
  }
}
