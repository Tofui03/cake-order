export const ORDER_STATUSES = ['待确认', '已确认', '已完成', '取消'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const FULFILLMENTS = ['自取', '送货'] as const
export type Fulfillment = (typeof FULFILLMENTS)[number]

export interface Settings {
  shopName: string
  whatsapp: string
  duitnowQrUrl: string | null
}

export interface Cake {
  id: string
  name: string
  price: number
  photoUrl: string | null
  emoji: string
  color: string
  active: boolean
  sortOrder: number
}

export interface OrderItem {
  cakeId: string
  name: string
  qty: number
  price: number
}

export interface Order {
  id: string
  orderNo: string
  customerName: string
  phone: string
  pickupDate: string
  fulfillment: Fulfillment
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: string
  receiptPath: string | null
}

export interface NewOrder {
  orderNo: string
  customerName: string
  phone: string
  pickupDate: string
  fulfillment: Fulfillment
  items: OrderItem[]
  total: number
  receiptPath: string | null
}

export interface ShopApi {
  readonly mode: 'supabase' | 'demo'
  fetchSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
  fetchCakes(includeInactive: boolean): Promise<Cake[]>
  saveCake(cake: Cake): Promise<void>
  deleteCake(id: string): Promise<void>
  uploadCakePhoto(cakeId: string, file: File): Promise<string>
  uploadDuitNowQr(file: File): Promise<string>
  uploadReceipt(orderNo: string, file: File): Promise<string>
  receiptUrl(path: string): Promise<string>
  fetchOrders(): Promise<Order[]>
  createOrder(order: NewOrder): Promise<void>
  setOrderStatus(id: string, status: OrderStatus): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  signedIn(): Promise<boolean>
  onAuth(listener: (signedIn: boolean) => void): () => void
}
