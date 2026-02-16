export interface AdminProfile {
  member_id: string
  member_no: string
  email: string
  role: string
  is_admin: boolean
  firstname_th: string
  lastname_th: string
  firstname_en: string
  lastname_en: string
  phone: string | null
  actor_is_admin: boolean
  is_acting_as: boolean
  last_login: number
  registration: number
}

export interface UpdateProfileData {
  firstname_th: string
  lastname_th: string
  firstname_en: string
  lastname_en: string
  phone?: string | null
}

export interface ChangePasswordData {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface ProfileResponse {
  code: string | number
  message: string
  data: AdminProfile
}

export interface UpdateProfileResponse {
  code: string | number
  message: string
  data: AdminProfile | null
}

export interface ChangePasswordResponse {
  code: string | number
  message: string
  data: null
}
