import type { ApiResponse, ContactReplyItem, ContactReplyPayload } from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useContactReplies() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoadingReplies = ref(false)
  const isSubmittingReply = ref(false)
  const replyErrorMessage = ref('')
  const replies = ref<ContactReplyItem[]>([])

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

  function buildRepliesPath(contactMessageId: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.contactMessageReplies
    return `${apiBaseUrl}${endpoint}/${contactMessageId}/replies`
  }

  async function fetchReplies(contactMessageId: string) {
    replyErrorMessage.value = ''
    isLoadingReplies.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<ContactReplyItem[]>>(buildRepliesPath(contactMessageId), {
        method: 'GET'
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || 'ไม่สามารถโหลดข้อความสนทนาได้')
      }

      replies.value = response.data || []
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        replyErrorMessage.value = fetchError.data?.message || fetchError.message || 'ไม่สามารถโหลดข้อความสนทนาได้'
      } else {
        replyErrorMessage.value = error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อความสนทนาได้'
      }
      return false
    } finally {
      isLoadingReplies.value = false
    }
  }

  async function createReply(contactMessageId: string, payload: ContactReplyPayload) {
    replyErrorMessage.value = ''
    isSubmittingReply.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<ContactReplyItem>>(buildRepliesPath(contactMessageId), {
        method: 'POST',
        body: payload
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || 'ไม่สามารถส่งข้อความได้')
      }

      if (response.data) {
        replies.value = [...replies.value, response.data]
      }
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        replyErrorMessage.value = fetchError.data?.message || fetchError.message || 'ไม่สามารถส่งข้อความได้'
      } else {
        replyErrorMessage.value = error instanceof Error ? error.message : 'ไม่สามารถส่งข้อความได้'
      }
      return false
    } finally {
      isSubmittingReply.value = false
    }
  }

  return {
    isLoadingReplies,
    isSubmittingReply,
    replyErrorMessage,
    replies,
    fetchReplies,
    createReply
  }
}
