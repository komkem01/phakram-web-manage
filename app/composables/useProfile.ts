import type { AdminProfile, UpdateProfileData, ChangePasswordData, ProfileResponse, UpdateProfileResponse, ChangePasswordResponse } from '~/types/profile'
import { PROFILE_CONFIG } from '~/constants/profile'

export function useProfile() {
  const config = useRuntimeConfig()
  const { refreshAccessToken, logout } = useAdminAuth()
  const isLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const profile = ref<AdminProfile | null>(null)

  function isSuccessCode(code: string | number) {
    return code === '200' || code === 200
  }

  function getAuthHeader() {
    if (process.client) {
      const token = localStorage.getItem('access_token')
      const tokenType = localStorage.getItem('token_type') || 'Bearer'
      return token ? `${tokenType} ${token}` : ''
    }
    return ''
  }

  function isUnauthorizedError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false
    }

    const statusCode = 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined
    const status = 'status' in error ? (error as { status?: number }).status : undefined
    const dataCode = 'data' in error
      ? (error as { data?: { code?: string | number } }).data?.code
      : undefined

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

  async function getCurrentMemberId() {
    if (profile.value?.member_id) {
      return profile.value.member_id
    }

    const loaded = await fetchProfile()
    if (!loaded || !profile.value?.member_id) {
      throw new Error(PROFILE_CONFIG.messages.loadError)
    }

    return profile.value.member_id
  }

  async function fetchProfile() {
    errorMessage.value = ''
    isLoading.value = true

    try {
      const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
      const endpoint = PROFILE_CONFIG.endpoints.getProfile
      const requestUrl = `${apiBaseUrl}${endpoint}`

      const response = await fetchWithAuthRetry<ProfileResponse>(requestUrl, {
        method: 'GET'
      })

      if (!isSuccessCode(response.code) || !response.data) {
        throw new Error(response.message || PROFILE_CONFIG.messages.loadError)
      }

      profile.value = response.data
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || PROFILE_CONFIG.messages.loadError
      } else {
        errorMessage.value = error instanceof Error
          ? error.message
          : PROFILE_CONFIG.messages.loadError
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(data: UpdateProfileData) {
    errorMessage.value = ''
    successMessage.value = ''
    isLoading.value = true

    try {
      const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
      const memberId = await getCurrentMemberId()
      const endpoint = PROFILE_CONFIG.endpoints.updateProfile.replace(':id', memberId)
      const requestUrl = `${apiBaseUrl}${endpoint}`

      const response = await fetchWithAuthRetry<UpdateProfileResponse>(requestUrl, {
        method: 'PATCH',
        body: data
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || PROFILE_CONFIG.messages.updateError)
      }

      if (response.data) {
        profile.value = response.data
      }
      successMessage.value = response.message || PROFILE_CONFIG.messages.updateSuccess
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || PROFILE_CONFIG.messages.updateError
      } else {
        errorMessage.value = error instanceof Error
          ? error.message
          : PROFILE_CONFIG.messages.updateError
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(data: ChangePasswordData) {
    errorMessage.value = ''
    successMessage.value = ''

    if (data.new_password !== data.confirm_password) {
      errorMessage.value = PROFILE_CONFIG.messages.passwordMismatch
      return false
    }

    isLoading.value = true

    try {
      const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
      const memberId = await getCurrentMemberId()
      const endpoint = PROFILE_CONFIG.endpoints.changePassword.replace(':id', memberId)
      const requestUrl = `${apiBaseUrl}${endpoint}`

      const response = await fetchWithAuthRetry<ChangePasswordResponse>(requestUrl, {
        method: 'PATCH',
        body: {
          current_password: data.current_password,
          new_password: data.new_password
        }
      })

      if (!isSuccessCode(response.code)) {
        throw new Error(response.message || PROFILE_CONFIG.messages.passwordChangeError)
      }

      successMessage.value = response.message || PROFILE_CONFIG.messages.passwordChangeSuccess
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || PROFILE_CONFIG.messages.passwordChangeError
      } else {
        errorMessage.value = error instanceof Error
          ? error.message
          : PROFILE_CONFIG.messages.passwordChangeError
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    profile,
    isLoading,
    errorMessage,
    successMessage,
    fetchProfile,
    updateProfile,
    changePassword
  }
}
