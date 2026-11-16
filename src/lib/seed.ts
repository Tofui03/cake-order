import { addDays, todayIso } from './dates'
import { lineTotal } from './money'
import type { Cake, Order, OrderItem, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  shopName: "Mum's Cakes",
  whatsapp: '60123456789',
  duitnowQrUrl: null,
}

export const CAKE_IDS = {
  choc: 'a1111111-1111-4111-8111-111111111111',
  cheese: 'a2222222-2222-4222-8222-222222222222',
  pandan: 'a3333333-3333-4333-8333-333333333333',
  straw: 'a4444444-4444-4444-8444-444444444444',
  cup: 'a5555555-5555-4555-8555-555555555555',
} as const

export const PLACEHOLDER_COLORS = ['#f0e0d4', '#fbf0cf', '#e2f1dc', '#fbe1e4', '#ece3f6', '#e7eef8', '#fde7d6']

export function placeholderColor(index: number): string {
  return PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length] ?? '#f0e0d4'
}

export const SEED_CAKES: Cake[] = [
  { id: CAKE_IDS.choc, name: 'Chocolate Cake 6"', price: 68, photoUrl: null, emoji: '🍫', color: '#f0e0d4', active: true, sortOrder: 1 },
  { id: CAKE_IDS.cheese, name: 'Cheesecake 6"', price: 75, photoUrl: null, emoji: '🧀', color: '#fbf0cf', active: true, sortOrder: 2 },
  { id: CAKE_IDS.pandan, name: 'Pandan Chiffon', price: 45, photoUrl: null, emoji: '🌿', color: '#e2f1dc', active: true, sortOrder: 3 },
  { id: CAKE_IDS.straw, name: 'Strawberry Cream 8"', price: 98, photoUrl: null, emoji: '🍓', color: '#fbe1e4', active: true, sortOrder: 4 },
  { id: CAKE_IDS.cup, name: 'Cupcakes (6 pcs)', price: 30, photoUrl: null, emoji: '🧁', color: '#ece3f6', active: true, sortOrder: 5 },
]

function item(cakeId: string, qty: number): OrderItem {
  const cake = SEED_CAKES.find((entry) => entry.id === cakeId)
  if (!cake) throw new Error(`Missing seed cake ${cakeId}`)
  return { cakeId, name: cake.name, qty, price: cake.price }
}

export function seedOrders(now = new Date()): Order[] {
  const day1 = addDays(todayIso(now), 1)
  const day2 = addDays(todayIso(now), 2)
  const created = now.toISOString()
  const mei: OrderItem[] = [item(CAKE_IDS.choc, 1), item(CAKE_IDS.cup, 2)]
  const ahmad: OrderItem[] = [item(CAKE_IDS.cheese, 1)]
  const siew: OrderItem[] = [item(CAKE_IDS.straw, 1), item(CAKE_IDS.choc, 1)]
  return [
    {
      id: 'b1111111-1111-4111-8111-111111111111',
      orderNo: 'M1L2',
      customerName: 'Mei Ling',
      phone: '012-3456789',
      pickupDate: day1,
      fulfillment: '自取',
      items: mei,
      total: lineTotal(mei),
      status: '已确认',
      createdAt: created,
      receiptPath: null,
    },
    {
      id: 'b2222222-2222-4222-8222-222222222222',
      orderNo: 'AH03',
      customerName: 'Ahmad',
      phone: '016-2223333',
      pickupDate: day1,
      fulfillment: '送货',
      items: ahmad,
      total: lineTotal(ahmad),
      status: '待确认',
      createdAt: created,
      receiptPath: null,
    },
    {
      id: 'b3333333-3333-4333-8333-333333333333',
      orderNo: 'SY16',
      customerName: 'Siew Yee',
      phone: '017-8889999',
      pickupDate: day2,
      fulfillment: '自取',
      items: siew,
      total: lineTotal(siew),
      status: '已确认',
      createdAt: created,
      receiptPath: null,
    },
  ]
}
