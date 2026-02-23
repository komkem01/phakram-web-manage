import type {
  ApiPaginate,
  ApiResponse,
  PromotionReportSummary,
  PromotionUsageItem,
  PromotionUsageListParams
} from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useSystemPromotionReports() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const errorMessage = ref('')
  const summary = ref<PromotionReportSummary>({
    total_promotions: 0,
    active_promotions: 0,
    collected_coupons: 0,
    used_coupons: 0,
    total_discount_amount: 0
  })
  const usages = ref<PromotionUsageItem[]>([])
  const paginate = ref<ApiPaginate>({ page: 1, size: 10, total: 0 })

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

  function buildSummaryPath() {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    return `${apiBaseUrl}${SETTINGS_CONFIG.endpoints.promotionReportSummary}`
  }

  function buildUsageUrl(params: PromotionUsageListParams = {}) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.promotionReportUsages
    const url = new URL(`${apiBaseUrl}${endpoint}`)

    url.searchParams.set('page', String(params.page || 1))
    url.searchParams.set('size', String(params.size || 10))

    if (params.search) url.searchParams.set('search', params.search)
    if (params.promotion_id) url.searchParams.set('promotion_id', params.promotion_id)

    return url.toString()
  }

  async function fetchSummary() {
    errorMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<PromotionReportSummary>>(buildSummaryPath(), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)
      summary.value = response.data || summary.value
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || SETTINGS_CONFIG.messages.loadError
      } else {
        errorMessage.value = error instanceof Error ? error.message : SETTINGS_CONFIG.messages.loadError
      }
      return false
    }
  }

  async function fetchUsages(params: PromotionUsageListParams = {}) {
    errorMessage.value = ''
    isLoading.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<PromotionUsageItem[]>>(buildUsageUrl(params), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)

      usages.value = response.data || []
      paginate.value = response.paginate || { page: 1, size: 10, total: usages.value.length }
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || SETTINGS_CONFIG.messages.loadError
      } else {
        errorMessage.value = error instanceof Error ? error.message : SETTINGS_CONFIG.messages.loadError
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    summary,
    usages,
    paginate,
    fetchSummary,
    fetchUsages
  }
}
