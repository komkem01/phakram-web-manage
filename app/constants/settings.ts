export const SETTINGS_CONFIG = {
  endpoints: {
    genders: '/system/genders',
    prefixes: '/system/prefixes',
    provinces: '/system/provinces',
    districts: '/system/districts',
    subDistricts: '/system/sub_districts',
    zipcodes: '/system/zipcodes',
    statuses: '/system/statuses',
    tiers: '/system/tiers',
    banks: '/system/banks',
    payments: '/system/payments',
    productStocks: '/system/product_stocks',
    members: '/auth/members',
    orders: '/auth/orders',
    categories: '/system/categories',
    products: '/system/products'
  },
  messages: {
    loadError: 'ไม่สามารถโหลดข้อมูลได้',
    createSuccess: 'บันทึกข้อมูลสำเร็จ',
    createError: 'บันทึกข้อมูลไม่สำเร็จ',
    updateSuccess: 'อัปเดตข้อมูลสำเร็จ',
    updateError: 'อัปเดตข้อมูลไม่สำเร็จ',
    deleteSuccess: 'ลบข้อมูลสำเร็จ',
    deleteError: 'ลบข้อมูลไม่สำเร็จ',
    requiredFields: 'กรุณากรอกข้อมูลให้ครบถ้วน'
  }
} as const
