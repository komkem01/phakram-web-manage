import type { ApiPaginate, ApiResponse, ListParams, ProductStockItem } from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useSystemProductStocks() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const errorMessage = ref('')
  const stocks = ref<ProductStockItem[]>([])
  const paginate = ref<ApiPaginate>({ page: 1, size: 10, total: 0 })

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

  async function fetchWithAuthRetry<T>(requestUrl: string, options: Omit<Parameters<typeof $fetch<T>>[1], 'headers'> = {}) {
    const authHeader = getAuthHeader()
    const requestHeaders = authHeader ? { Authorization: authHeader } : {}

    try {
      return await $fetch<T>(requestUrl, { ...options, headers: requestHeaders })
    } catch (error) {
      if (!isUnauthorizedError(error)) throw error

      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        logout()
        await navigateTo('/')
        throw error
      }

      const refreshedAuthHeader = getAuthHeader()
      const refreshedRequestHeaders = refreshedAuthHeader ? { Authorization: refreshedAuthHeader } : {}
      return await $fetch<T>(requestUrl, { ...options, headers: refreshedRequestHeaders })
    }
  }

  function buildUrl(params: ListParams = {}) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.productStocks
    const url = new URL(`${apiBaseUrl}${endpoint}/`)

    url.searchParams.set('page', String(params.page || 1))
    url.searchParams.set('size', String(params.size || 10))
    if (params.sort_by) url.searchParams.set('sort_by', params.sort_by)
    if (params.order_by) url.searchParams.set('order_by', params.order_by)

    return url.toString()
  }

  async function fetchStocks(params: ListParams = {}) {
    errorMessage.value = ''
    isLoading.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<ProductStockItem[]>>(buildUrl(params), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || 'ไม่สามารถโหลดข้อมูลสต็อกได้')

      stocks.value = response.data || []
      paginate.value = response.paginate || { page: 1, size: 10, total: stocks.value.length }
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || 'ไม่สามารถโหลดข้อมูลสต็อกได้'
      } else {
        errorMessage.value = error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลสต็อกได้'
      }
      stocks.value = []
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    stocks,
    paginate,
    fetchStocks
  }
}
