export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthTokenData {
  access_token: string
  refresh_token: string
  token_type: string
  access_expires_at: number
  refresh_expires_at: number
}

export interface AuthResponse {
  code: string
  message: string
  data: AuthTokenData
}
