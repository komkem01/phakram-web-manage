export const AUTH_CONFIG = {
  endpoints: {
    login: '/public/auth/login',
    refresh: '/public/auth/refresh'
  },
  messages: {
    requiredFields: 'กรุณากรอกอีเมลและรหัสผ่าน',
    loginSuccess: 'เข้าสู่ระบบสำเร็จ',
    loginError: 'เข้าสู่ระบบไม่สำเร็จ',
    loading: 'กำลังเข้าสู่ระบบ...',
    login: 'เข้าสู่ระบบ'
  }
} as const
