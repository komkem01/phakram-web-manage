import type { ApiResponse, ProductDetailItem, ProductDetailPayload } from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useProductDetail() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const detail = ref<ProductDetailItem | null>(null)

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
    try {
      return await $fetch<T>(requestUrl, { ...options, headers: { Authorization: getAuthHeader() } })
    } catch (error) {
      if (!isUnauthorizedError(error)) throw error
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        logout()
        await navigateTo('/')
        throw error
      }
      return await $fetch<T>(requestUrl, { ...options, headers: { Authorization: getAuthHeader() } })
    }
  }

  function buildPath(productId: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    return `${apiBaseUrl}${SETTINGS_CONFIG.endpoints.products}/${productId}/detail`
  }

  async function fetchDetail(productId: string) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const response = await fetchWithAuthRetry<ApiResponse<ProductDetailItem>>(buildPath(productId), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message)
      detail.value = response.data || null
      return true
    } catch (error) {
      detail.value = null
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function createDetail(productId: string, payload: ProductDetailPayload) {
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(buildPath(productId), { method: 'POST', body: payload })
      if (!isSuccessCode(response.code)) throw new Error(response.message)
      successMessage.value = response.message
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'บันทึกข้อมูลไม่สำเร็จ'
      return false
    }
  }

  async function updateDetail(productId: string, payload: ProductDetailPayload) {
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(buildPath(productId), { method: 'PATCH', body: payload })
      if (!isSuccessCode(response.code)) throw new Error(response.message)
      successMessage.value = response.message
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'อัปเดตข้อมูลไม่สำเร็จ'
      return false
    }
  }

  async function deleteDetail(productId: string) {
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(buildPath(productId), { method: 'DELETE' })
      if (!isSuccessCode(response.code)) throw new Error(response.message)
      successMessage.value = response.message
      detail.value = null
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'ลบข้อมูลไม่สำเร็จ'
      return false
    }
  }

  return { isLoading, errorMessage, successMessage, detail, fetchDetail, createDetail, updateDetail, deleteDetail }
}
