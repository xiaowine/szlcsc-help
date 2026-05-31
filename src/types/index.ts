export interface Coupon {
  coupon_name: string
  brand_name: string
  brand_id: string
  activity_name?: string
  min_order_amount: number
  coupon_amount: number
  min_order_after_discount: number
  receive_customer_num: number
  catalog_groups: string[]
}

export type CouponData = Record<string, Coupon[]>
