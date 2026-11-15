import { isOnOrAfter, tomorrowIso } from './dates'
import { normalizeWhatsApp } from './whatsapp'

export interface PlaceOrderInput {
  ready: boolean
  submitting: boolean
  total: number
  name: string
  phone: string
  pickupDate: string
  fulfillment: string
  whatsapp: string
  paymentRequired: boolean
  hasReceipt: boolean
  now?: Date
}

export function canPlaceOrder(input: PlaceOrderInput): boolean {
  const earliest = tomorrowIso(input.now ?? new Date())
  return (
    input.ready &&
    !input.submitting &&
    input.total > 0 &&
    input.name.trim().length > 0 &&
    input.phone.trim().length > 0 &&
    isOnOrAfter(input.pickupDate, earliest) &&
    (input.fulfillment === '自取' || input.fulfillment === '送货') &&
    normalizeWhatsApp(input.whatsapp).length >= 8 &&
    (!input.paymentRequired || input.hasReceipt)
  )
}
