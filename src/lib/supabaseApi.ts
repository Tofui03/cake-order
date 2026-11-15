import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { photoExtension, photoProblem, receiptObjectName, receiptProblem } from './photos'
import type { Cake, Fulfillment, NewOrder, Order, OrderItem, OrderStatus, Settings, ShopApi } from './types'

interface CakeRow {
  id: string
  name: string
  price: number | string
  photo_url: string | null
  emoji: string
  color: string
  active: boolean
  sort_order: number
}

interface OrderRow {
  id: string
  order_no: string
  customer_name: string
  phone: string
  pickup_date: string
  fulfillment: Fulfillment
  items: OrderItem[]
  total: number | string
  status: OrderStatus
  created_at: string
  receipt_path: string | null
}

function asNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function mapCake(row: CakeRow): Cake {
  return {
    id: row.id,
    name: row.name,
    price: asNumber(row.price),
    photoUrl: row.photo_url,
    emoji: row.emoji || '🎂',
    color: row.color || '#f0e0d4',
    active: row.active,
    sortOrder: row.sort_order,
  }
}

function mapOrder(row: OrderRow): Order {
  const items = Array.isArray(row.items) ? row.items : []
  return {
    id: row.id,
    orderNo: row.order_no,
    customerName: row.customer_name,
    phone: row.phone,
    pickupDate: row.pickup_date,
    fulfillment: row.fulfillment,
    items,
    total: asNumber(row.total),
    status: row.status,
    createdAt: row.created_at,
    receiptPath: row.receipt_path,
  }
}

function raise(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export function createSupabaseApi(url: string, key: string): ShopApi {
  const supabase: SupabaseClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })

  return {
    mode: 'supabase',
    async fetchSettings() {
      const { data, error } = await supabase
        .from('settings')
        .select('shop_name, whatsapp, duitnow_qr_url')
        .eq('id', 1)
        .single()
      raise(error)
      const row = data as { shop_name: string; whatsapp: string; duitnow_qr_url: string | null }
      return { shopName: row.shop_name, whatsapp: row.whatsapp, duitnowQrUrl: row.duitnow_qr_url }
    },
    async saveSettings(settings: Settings) {
      const { error } = await supabase
        .from('settings')
        .update({
          shop_name: settings.shopName,
          whatsapp: settings.whatsapp,
          duitnow_qr_url: settings.duitnowQrUrl,
        })
        .eq('id', 1)
      raise(error)
    },
    async fetchCakes(includeInactive) {
      let query = supabase.from('cakes').select('*').order('sort_order')
      if (!includeInactive) query = query.eq('active', true)
      const { data, error } = await query
      raise(error)
      return ((data ?? []) as CakeRow[]).map(mapCake)
    },
    async saveCake(cake) {
      const { error } = await supabase.from('cakes').upsert({
        id: cake.id,
        name: cake.name,
        price: cake.price,
        photo_url: cake.photoUrl,
        emoji: cake.emoji,
        color: cake.color,
        active: cake.active,
        sort_order: cake.sortOrder,
      })
      raise(error)
    },
    async deleteCake(id) {
      const { error } = await supabase.from('cakes').delete().eq('id', id)
      raise(error)
    },
    async uploadCakePhoto(cakeId, file) {
      const problem = photoProblem(file)
      if (problem) throw new Error(problem)
      const ext = photoExtension(file) ?? 'jpg'
      const path = `${cakeId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('cake-photos').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      raise(error)
      const { data } = supabase.storage.from('cake-photos').getPublicUrl(path)
      return data.publicUrl
    },
    async uploadDuitNowQr(file) {
      const problem = photoProblem(file)
      if (problem) throw new Error(problem)
      const ext = photoExtension(file) ?? 'jpg'
      const path = `duitnow/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('cake-photos').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      raise(error)
      const { data } = supabase.storage.from('cake-photos').getPublicUrl(path)
      return data.publicUrl
    },
    async uploadReceipt(orderNo, file) {
      const problem = receiptProblem(file)
      if (problem) throw new Error(problem)
      const path = receiptObjectName(orderNo, file)
      const { error } = await supabase.storage.from('receipts').upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })
      raise(error)
      return path
    },
    async receiptUrl(path) {
      const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 120)
      raise(error)
      if (!data?.signedUrl) throw new Error('signed url')
      return data.signedUrl
    },
    async fetchOrders() {
      const { data, error } = await supabase.from('orders').select('*').order('pickup_date')
      raise(error)
      return ((data ?? []) as OrderRow[]).map(mapOrder)
    },
    async createOrder(order: NewOrder) {
      // Do not chain .select(). Anon cannot read orders, and the default
      // insert does not ask PostgREST to return the row.
      const { error } = await supabase.from('orders').insert({
        order_no: order.orderNo.replace(/^#/, ''),
        customer_name: order.customerName.trim(),
        phone: order.phone.trim(),
        pickup_date: order.pickupDate,
        fulfillment: order.fulfillment,
        items: order.items,
        total: order.total,
        status: '待确认',
        receipt_path: order.receiptPath,
      })
      raise(error)
    },
    async setOrderStatus(id, status) {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      raise(error)
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      raise(error)
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      raise(error)
    },
    async signedIn() {
      const { data } = await supabase.auth.getSession()
      return Boolean(data.session)
    },
    onAuth(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        listener(Boolean(session))
      })
      return () => data.subscription.unsubscribe()
    },
  }
}
