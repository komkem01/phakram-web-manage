import type { ApiResponse, ProductImageItem, ProductImageUploadPayload } from '~/types/settings'
import { SETTINGS_CONFIG } from '~/constants/settings'

export function useProductImages() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()

  const isLoading = ref(false)
  const isUploading = ref(false)
  const deletingImageId = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')
  const images = ref<ProductImageItem[]>([])

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

  function buildPath(productId: string) {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    return `${apiBaseUrl}${SETTINGS_CONFIG.endpoints.products}/${productId}/images`
  }

  async function fetchImages(productId: string) {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<ProductImageItem[]>>(buildPath(productId), { method: 'GET' })
      if (!isSuccessCode(response.code)) throw new Error(response.message || 'โหลดรูปสินค้าไม่สำเร็จ')
      images.value = response.data || []
      return true
    } catch (error) {
      images.value = []
      errorMessage.value = error instanceof Error ? error.message : 'โหลดรูปสินค้าไม่สำเร็จ'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function uploadImage(productId: string, payload: ProductImageUploadPayload) {
    isUploading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<ProductImageItem>>(buildPath(productId), {
        method: 'POST',
        body: payload
      })
      if (!isSuccessCode(response.code)) throw new Error(response.message || 'อัปโหลดรูปสินค้าไม่สำเร็จ')

      successMessage.value = response.message || 'อัปโหลดรูปสำเร็จ'
      await fetchImages(productId)
      return response.data || null
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'อัปโหลดรูปสินค้าไม่สำเร็จ'
      return null
    } finally {
      isUploading.value = false
    }
  }

  async function deleteImage(productId: string, imageId: string) {
    const normalizedImageID = String(imageId || '').trim()
    if (!normalizedImageID) return false

    deletingImageId.value = normalizedImageID
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const response = await fetchWithAuthRetry<ApiResponse<null>>(`${buildPath(productId)}/${encodeURIComponent(normalizedImageID)}`, {
        method: 'DELETE'
      })
      if (!isSuccessCode(response.code)) throw new Error(response.message || 'ลบรูปสินค้าไม่สำเร็จ')

      successMessage.value = response.message || 'ลบรูปสำเร็จ'
      await fetchImages(productId)
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'ลบรูปสินค้าไม่สำเร็จ'
      return false
    } finally {
      deletingImageId.value = ''
    }
  }

  return {
    isLoading,
    isUploading,
    deletingImageId,
    errorMessage,
    successMessage,
    images,
    fetchImages,
    uploadImage,
    deleteImage
  }
}
