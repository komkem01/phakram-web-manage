import type {
  ApiResponse,
  CookiePolicyVersionItem,
  CreateCookiePolicyVersionPayload
} from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useCookiePolicySettings() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const isCreating = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const versions = ref<CookiePolicyVersionItem[]>([])

  function isSuccessCode(code: string | number) {
    return code === '200' || code === 200
  }

  function getAuthHeaders() {
    if (!process.client) {
      return { 'ngrok-skip-browser-warning': 'true' }
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

  async function fetchWithAuthRetry<T>(requestUrl: string, options: Omit<Parameters<typeof $fetch<T>>[1], 'headers'> = {}) {
    try {
      return await $fetch<T>(requestUrl, { ...options, headers: getAuthHeaders() })
    } catch (error) {
      if (!isUnauthorizedError(error)) throw error

      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        logout()
        await navigateTo('/')
        throw error
      }

      return await $fetch<T>(requestUrl, { ...options, headers: getAuthHeaders() })
    }
  }

  function buildPath() {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    return `${apiBaseUrl}${SETTINGS_CONFIG.endpoints.cookiePolicies}`
  }

  async function fetchVersions() {
    errorMessage.value = ''
    isLoading.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<CookiePolicyVersionItem[]>>(buildPath(), { method: 'GET' })
      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || 'โหลดเงื่อนไขคุกกี้ไม่สำเร็จ')
      }

      versions.value = response.data || []
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || 'โหลดเงื่อนไขคุกกี้ไม่สำเร็จ'
      } else {
        errorMessage.value = error instanceof Error ? error.message : 'โหลดเงื่อนไขคุกกี้ไม่สำเร็จ'
      }
      versions.value = []
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function createVersion(payload: CreateCookiePolicyVersionPayload) {
    errorMessage.value = ''
    successMessage.value = ''
    isCreating.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<CookiePolicyVersionItem>>(buildPath(), {
        method: 'POST',
        body: payload
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || 'สร้างเวอร์ชันเงื่อนไขไม่สำเร็จ')
      }

      successMessage.value = response.message || 'สร้างเวอร์ชันใหม่สำเร็จ'
      await fetchVersions()
      return response.data || null
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || 'สร้างเวอร์ชันเงื่อนไขไม่สำเร็จ'
      } else {
        errorMessage.value = error instanceof Error ? error.message : 'สร้างเวอร์ชันเงื่อนไขไม่สำเร็จ'
      }
      return null
    } finally {
      isCreating.value = false
    }
  }

  return {
    isLoading,
    isCreating,
    errorMessage,
    successMessage,
    versions,
    fetchVersions,
    createVersion
  }
}
