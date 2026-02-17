import type { ApiPaginate, ApiResponse, ListParams, TierItem, TierPayload } from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useSystemTiers() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const tiers = ref<TierItem[]>([])
  const paginate = ref<ApiPaginate>({ page: 1, size: 10, total: 0 })

  function isSuccessCode(code: string | number) {
    return code === '200' || code === 200
  }

  function getAuthHeader() {
    if (!process.client) {
      return ''
    }

    const token = localStorage.getItem('access_token')
    const tokenType = localStorage.getItem('token_type') || 'Bearer'
    return token ? `${tokenType} ${token}` : ''
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
        headers: {
          Authorization: getAuthHeader()
        }
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
        headers: {
          Authorization: getAuthHeader()
        }
      })
    }
  }

  function buildUrl(params: ListParams = {}) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.tiers
    const url = new URL(`${apiBaseUrl}${endpoint}/`)

    url.searchParams.set('page', String(params.page || 1))
    url.searchParams.set('size', String(params.size || 10))

    if (params.search) {
      url.searchParams.set('search', params.search)
    }
    if (params.search_by) {
      url.searchParams.set('search_by', params.search_by)
    }
    if (params.sort_by) {
      url.searchParams.set('sort_by', params.sort_by)
    }
    if (params.order_by) {
      url.searchParams.set('order_by', params.order_by)
    }

    return url.toString()
  }

  function buildPath(id = '') {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const endpoint = SETTINGS_CONFIG.endpoints.tiers
    return id ? `${apiBaseUrl}${endpoint}/${id}` : `${apiBaseUrl}${endpoint}/`
  }

  async function fetchTiers(params: ListParams = {}) {
    errorMessage.value = ''
    isLoading.value = true

    try {
      const response = await fetchWithAuthRetry<ApiResponse<TierItem[]>>(buildUrl(params), { method: 'GET' })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.loadError)
      }

      tiers.value = response.data || []
      paginate.value = response.paginate || { page: 1, size: 10, total: tiers.value.length }
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

  async function createTier(payload: TierPayload) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(buildPath(), { method: 'POST', body: payload })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.createError)
      }

      successMessage.value = response.message || SETTINGS_CONFIG.messages.createSuccess
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || SETTINGS_CONFIG.messages.createError
      } else {
        errorMessage.value = error instanceof Error ? error.message : SETTINGS_CONFIG.messages.createError
      }
      return false
    }
  }

  async function updateTier(id: string, payload: TierPayload) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(buildPath(id), { method: 'PATCH', body: payload })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.updateError)
      }

      successMessage.value = response.message || SETTINGS_CONFIG.messages.updateSuccess
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || SETTINGS_CONFIG.messages.updateError
      } else {
        errorMessage.value = error instanceof Error ? error.message : SETTINGS_CONFIG.messages.updateError
      }
      return false
    }
  }

  async function deleteTier(id: string) {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(buildPath(id), { method: 'DELETE' })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || SETTINGS_CONFIG.messages.deleteError)
      }

      successMessage.value = response.message || SETTINGS_CONFIG.messages.deleteSuccess
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || SETTINGS_CONFIG.messages.deleteError
      } else {
        errorMessage.value = error instanceof Error ? error.message : SETTINGS_CONFIG.messages.deleteError
      }
      return false
    }
  }

  return {
    isLoading,
    errorMessage,
    successMessage,
    tiers,
    paginate,
    fetchTiers,
    createTier,
    updateTier,
    deleteTier
  }
}
