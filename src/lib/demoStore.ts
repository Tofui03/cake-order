import { photoProblem } from './photos'
import { DEFAULT_SETTINGS, SEED_CAKES, seedOrders } from './seed'
import type { Cake, NewOrder, Order, OrderStatus, Settings, ShopApi } from './types'

const STORAGE_KEY = 'cake-order:v1'

interface DemoState {
  settings: Settings
  cakes: Cake[]
  orders: Order[]
  email: string | null
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function seedState(): DemoState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    cakes: SEED_CAKES.map((cake) => ({ ...cake })),
    orders: seedOrders(),
    email: null,
  }
}

function read(): DemoState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const state = seedState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>
    if (!parsed.settings || !Array.isArray(parsed.cakes) || !Array.isArray(parsed.orders)) {
      throw new Error('bad demo state')
    }
    return {
      settings: parsed.settings,
      cakes: parsed.cakes,
      orders: parsed.orders,
      email: parsed.email ?? null,
    }
  } catch {
    const state = seedState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  }
}

function write(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

export function createDemoApi(): ShopApi {
  const listeners = new Set<(signedIn: boolean) => void>()

  function emit(signedIn: boolean): void {
    for (const listener of listeners) listener(signedIn)
  }

  return {
    mode: 'demo',
    async fetchSettings() {
      return clone(read().settings)
    },
    async saveSettings(settings) {
      const state = read()
      state.settings = clone(settings)
      write(state)
    },
    async fetchCakes(includeInactive) {
      const cakes = read().cakes.filter((cake) => includeInactive || cake.active)
      return clone(cakes).sort((a, b) => a.sortOrder - b.sortOrder)
    },
    async saveCake(cake) {
      const state = read()
      const index = state.cakes.findIndex((entry) => entry.id === cake.id)
      if (index >= 0) state.cakes[index] = clone(cake)
      else state.cakes.push(clone(cake))
      write(state)
    },
    async deleteCake(id) {
      const state = read()
      state.cakes = state.cakes.filter((cake) => cake.id !== id)
      write(state)
    },
    async uploadCakePhoto(_cakeId, file) {
      const problem = photoProblem(file)
      if (problem) throw new Error(problem)
      return readAsDataUrl(file)
    },
    async fetchOrders() {
      return clone(read().orders)
    },
    async createOrder(order: NewOrder) {
      const state = read()
      const stored: Order = {
        id: crypto.randomUUID(),
        orderNo: order.orderNo.replace(/^#/, ''),
        customerName: order.customerName.trim(),
        phone: order.phone.trim(),
        pickupDate: order.pickupDate,
        fulfillment: order.fulfillment,
        items: clone(order.items),
        total: order.total,
        status: '待确认',
        createdAt: new Date().toISOString(),
      }
      state.orders.push(stored)
      write(state)
    },
    async setOrderStatus(id, status: OrderStatus) {
      const state = read()
      const order = state.orders.find((entry) => entry.id === id)
      if (!order) throw new Error('missing order')
      order.status = status
      write(state)
    },
    async signIn(email, password) {
      if (!email.trim() || !password) throw new Error('Invalid login credentials')
      const state = read()
      state.email = email.trim()
      write(state)
      emit(true)
    },
    async signOut() {
      const state = read()
      state.email = null
      write(state)
      emit(false)
    },
    async signedIn() {
      return read().email !== null
    },
    onAuth(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
