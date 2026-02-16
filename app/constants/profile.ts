export const PROFILE_CONFIG = {
  endpoints: {
    getProfile: '/auth/me',
    updateProfile: '/auth/members/:id',
    changePassword: '/auth/members/:id/password'
  },
  messages: {
    loadError: 'ไม่สามารถโหลดข้อมูลได้',
    updateSuccess: 'บันทึกข้อมูลสำเร็จ',
    updateError: 'บันทึกข้อมูลไม่สำเร็จ',
    passwordChangeSuccess: 'เปลี่ยนรหัสผ่านสำเร็จ',
    passwordChangeError: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
    passwordMismatch: 'รหัสผ่านใหม่ไม่ตรงกัน',
    requiredFields: 'กรุณากรอกข้อมูลให้ครบถ้วน'
  }
} as const
