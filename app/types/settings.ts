export interface ApiPaginate {
  page: number
  size: number
  total: number
}

export interface ApiResponse<T> {
  code: string | number
  message: string
  data: T
  paginate?: ApiPaginate
}

export interface GenderItem {
  id: string
  name_th: string
  name_en: string
  is_active: boolean
  created_at: string
}

export interface GenderPayload {
  name_th: string
  name_en: string
  is_active: boolean
}

export interface PrefixItem {
  id: string
  name_th: string
  name_en: string
  gender_id: string
  is_active: boolean
  created_at: string
}

export interface PrefixPayload {
  name_th: string
  name_en: string
  gender_id: string
  is_active: boolean
}

export interface ProvinceItem {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProvincePayload {
  name: string
  is_active: boolean
}

export interface DistrictItem {
  id: string
  province_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DistrictPayload {
  province_id: string
  name: string
  is_active: boolean
}

export interface SubDistrictItem {
  id: string
  district_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubDistrictPayload {
  district_id: string
  name: string
  is_active: boolean
}

export interface ZipcodeItem {
  id: string
  sub_districts_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ZipcodePayload {
  sub_districts_id: string
  name: string
  is_active: boolean
}

export interface StatusItem {
  id: string
  name_th: string
  name_en: string
  is_active: boolean
  created_at: string
}

export interface StatusPayload {
  name_th: string
  name_en: string
  is_active: boolean
}

export interface TierItem {
  id: string
  name_th: string
  name_en: string
  min_spending: number
  is_active: boolean
  discount_rate: number
  created_at: string
  updated_at: string
}

export interface TierPayload {
  name_th: string
  name_en: string
  min_spending: string
  is_active: boolean
  discount_rate: string
}

export interface BankItem {
  id: string
  name_th: string
  name_abb_th: string
  name_en: string
  name_abb_en: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankPayload {
  name_th: string
  name_abb_th: string
  name_en: string
  name_abb_en: string
  is_active: boolean
}

export interface SystemPaymentItem {
  id: string
  amount: string | number
  status: 'pending' | 'success' | 'failed' | 'refunded' | string
  approved_by?: string | null
  approved_at?: string | null
}

export interface StorageFileItem {
  id: string
  ref_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  is_active: boolean
  related_entity: string
  uploaded_by?: string
  created_at?: string
  updated_at?: string
}

export interface OrderPaymentDetail {
  payment: SystemPaymentItem | null
  slips: StorageFileItem[]
}

export interface SystemPaymentPayload {
  amount: string
  status: 'pending' | 'success' | 'failed' | 'refunded'
}

export interface CategoryItem {
  id: string
  parent_id?: string | null
  name_th: string
  name_en: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryPayload {
  parent_id?: string | null
  name_th: string
  name_en: string
  is_active: boolean
}

export interface ProductItem {
  id: string
  category_id: string
  name_th: string
  name_en: string
  product_no: string
  price: string | number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductPayload {
  category_id: string
  name_th: string
  name_en: string
  price: string
  is_active: boolean
}

export interface ProductDetailItem {
  id: string
  product_id: string
  description: string
  material: string
  dimensions: string
  weight: string | number
  care_instructions: string
}

export interface ProductDetailPayload {
  description: string
  material: string
  dimensions: string
  weight: string
  care_instructions: string
}

export interface ProductStockItem {
  id: string
  product_id: string
  unit_price: string | number
  stock_amount: number
  remaining: number
  created_at: string
  updated_at: string
}

export interface ProductStockPayload {
  stock_amount: number
  remaining: number
  action?: 'increase' | 'decrease'
  adjustment_qty?: number
}

export interface MemberItem {
  id: string
  member_no: string
  tier_id: string
  status_id: string
  prefix_id: string
  gender_id: string
  firstname_th: string
  lastname_th: string
  firstname_en: string
  lastname_en: string
  role: 'admin' | 'customer' | string
  phone: string
  created_at: number
  updated_at: number
  registration?: number | null
  last_login?: number | null
}

export interface UserListParams extends ListParams {
  role?: 'admin' | 'customer'
}

export interface MemberRegisterPayload {
  prefix_id: string
  gender_id: string
  firstname_th: string
  lastname_th: string
  firstname_en: string
  lastname_en: string
  role: 'admin' | 'customer'
  phone: string
  email: string
  password: string
  tier_id?: string
  status_id?: string
}

export interface MemberUpdatePayload {
  prefix_id?: string
  gender_id?: string
  firstname_th?: string
  lastname_th?: string
  firstname_en?: string
  lastname_en?: string
  role?: 'admin' | 'customer'
  phone?: string
  tier_id?: string
  status_id?: string
}

export type OrderStatus = 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price_per_unit: string | number
  total_item_amount: string | number
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_no: string
  member_id: string
  payment_id: string
  address_id: string
  status: OrderStatus | string
  shipping_tracking_no?: string
  payment_submitted?: boolean
  payment_rejected?: boolean
  payment_rejection_reason?: string
  total_amount: string | number
  discount_amount: string | number
  net_amount: string | number
  created_at: string
  updated_at: string
}

export interface OrderTimelineItem {
  action_type: string
  action_detail: string
  status: 'success' | 'failed' | string
  action_by?: string | null
  from_status?: string
  to_status?: string
  created_at: string
  updated_at: string
}

export interface OrderListParams extends ListParams {
  member_id?: string
  status?: OrderStatus | ''
  start_date?: number
  end_date?: number
}

export interface ListParams {
  page?: number
  size?: number
  search?: string
  search_by?: string
  sort_by?: string
  order_by?: 'asc' | 'desc' | 'ASC' | 'DESC'
}
