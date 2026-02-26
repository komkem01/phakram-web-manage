import type { LoginCredentials, AuthResponse } from '~/types/auth'
import { AUTH_CONFIG } from '~/constants/auth'

let refreshInFlight: Promise<boolean> | null = null

type AuthMeResponse = {
  code: string | number
  message?: string
  data?: {
    is_admin?: boolean
  }
}

export function useAdminAuth() {
  const config = useRuntimeConfig()
  const isSecureCookie = process.env.NODE_ENV === 'production'

  const isLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')

  function getNgrokHeaders() {
    return {
      'ngrok-skip-browser-warning': 'true'
    }
  }

  function setAuthTokens(data: AuthResponse['data']) {
    const now = Math.floor(Date.now() / 1000)
    const accessMaxAge = Math.max(data.access_expires_at - now, 0)
    const refreshMaxAge = Math.max(data.refresh_expires_at - now, 0)

    const accessToken = useCookie<string | null>('access_token', {
      sameSite: 'lax',
      secure: isSecureCookie,
      maxAge: accessMaxAge,
      default: () => null
    })
    const refreshToken = useCookie<string | null>('refresh_token', {
      sameSite: 'lax',
      secure: isSecureCookie,
      maxAge: refreshMaxAge,
      default: () => null
    })
    const tokenType = useCookie<string | null>('token_type', {
      sameSite: 'lax',
      secure: isSecureCookie,
      maxAge: refreshMaxAge,
      default: () => null
    })

    accessToken.value = data.access_token
    refreshToken.value = data.refresh_token
    tokenType.value = data.token_type || 'Bearer'

    if (process.client) {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('token_type', data.token_type || 'Bearer')
    }
  }

  async function validateAdminAccess() {
    const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
    const accessTokenCookie = useCookie<string | null>('access_token', {
      sameSite: 'lax',
      secure: isSecureCookie,
      default: () => null
    })
    const tokenTypeCookie = useCookie<string | null>('token_type', {
      sameSite: 'lax',
      secure: isSecureCookie,
      default: () => null
    })

    const accessToken = (accessTokenCookie.value || (process.client ? localStorage.getItem('access_token') : '') || '').trim()
    const tokenType = (tokenTypeCookie.value || (process.client ? localStorage.getItem('token_type') : '') || 'Bearer').trim()

    if (!accessToken) {
      return false
    }

    const response = await $fetch<AuthMeResponse>(`${apiBaseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        ...getNgrokHeaders(),
        Authorization: `${tokenType} ${accessToken}`
      }
    })

    const successCode = response.code === '200' || response.code === 200
    if (!successCode || !response.data?.is_admin) {
      return false
    }

    return true
  }

  function logout() {
    if (process.client) {
      const token = localStorage.getItem('access_token')
      const tokenTypeValue = localStorage.getItem('token_type') || 'Bearer'
      const authorization = token ? `${tokenTypeValue} ${token}` : ''
      const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''

      if (authorization) {
        void $fetch(`${apiBaseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            ...getNgrokHeaders(),
            Authorization: authorization
          }
        }).catch(() => undefined)
      }
    }

    const accessToken = useCookie<string | null>('access_token', {
      sameSite: 'lax',
      secure: isSecureCookie,
      maxAge: 0,
      default: () => null
    })
    const refreshToken = useCookie<string | null>('refresh_token', {
      sameSite: 'lax',
      secure: isSecureCookie,
      maxAge: 0,
      default: () => null
    })
    const tokenType = useCookie<string | null>('token_type', {
      sameSite: 'lax',
      secure: isSecureCookie,
      maxAge: 0,
      default: () => null
    })

    accessToken.value = null
    refreshToken.value = null
    tokenType.value = null

    if (process.client) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('token_type')
    }

    errorMessage.value = ''
    successMessage.value = ''
  }

  async function login(credentials: LoginCredentials) {
    errorMessage.value = ''
    successMessage.value = ''

    isLoading.value = true

    try {
      const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
      const endpoint = AUTH_CONFIG.endpoints.login
      const requestUrl = `${apiBaseUrl}${endpoint}`

      const response = await $fetch<AuthResponse>(requestUrl, {
        method: 'POST',
        headers: getNgrokHeaders(),
        body: credentials
      })

      if (response.code !== '200' || !response.data?.access_token) {
        throw new Error(response.message || AUTH_CONFIG.messages.loginError)
      }

      setAuthTokens(response.data)

      const isAdmin = await validateAdminAccess()
      if (!isAdmin) {
        logout()
        errorMessage.value = 'เฉพาะผู้ดูแลระบบเท่านั้นที่เข้าใช้งานระบบแอดมินได้'
        return false
      }

      successMessage.value = response.message || AUTH_CONFIG.messages.loginSuccess
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'data' in error) {
        const fetchError = error as { data?: { message?: string }, message?: string }
        errorMessage.value = fetchError.data?.message || fetchError.message || AUTH_CONFIG.messages.loginError
      } else {
        errorMessage.value = error instanceof Error
          ? error.message
          : AUTH_CONFIG.messages.loginError
      }

      return false
    } finally {
      isLoading.value = false
    }
  }

  async function refreshAccessToken() {
    if (refreshInFlight) {
      return refreshInFlight
    }

    refreshInFlight = (async () => {
      try {
        const refreshTokenCookie = useCookie<string | null>('refresh_token', {
          sameSite: 'lax',
          secure: isSecureCookie,
          default: () => null
        })

        const refreshTokenFromCookie = refreshTokenCookie.value
        const refreshTokenFromStorage = process.client ? localStorage.getItem('refresh_token') : null
        const storedRefreshToken = (refreshTokenFromCookie || refreshTokenFromStorage || '').trim()

        if (!storedRefreshToken) {
          return false
        }

        const apiBaseUrl = (config.public.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || ''
        const endpoint = AUTH_CONFIG.endpoints.refresh
        const requestUrl = `${apiBaseUrl}${endpoint}`

        const response = await $fetch<AuthResponse>(requestUrl, {
          method: 'POST',
          headers: getNgrokHeaders(),
          body: {
            refresh_token: storedRefreshToken
          }
        })

        if ((response.code !== '200' && response.code !== 200) || !response.data?.access_token) {
          return false
        }

        setAuthTokens(response.data)
        return true
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
  }

  return {
    isLoading,
    errorMessage,
    successMessage,
    login,
    logout,
    refreshAccessToken
  }
}
