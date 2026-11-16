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

export function missingOrderFields(input: PlaceOrderInput): string[] {
  const missing: string[] = []
  if (input.total <= 0) missing.push('select a cake')
  if (input.name.trim().length === 0) missing.push('your name')
  if (normalizeWhatsApp(input.phone).length < 8) missing.push('valid phone')
  const earliest = tomorrowIso(input.now ?? new Date())
  if (!isOnOrAfter(input.pickupDate, earliest)) missing.push('pickup date')
  if (input.paymentRequired && !input.hasReceipt) missing.push('payment receipt')
  return missing
}

export function canPlaceOrder(input: PlaceOrderInput): boolean {
  return (
    input.ready &&
    !input.submitting &&
    (input.fulfillment === '自取' || input.fulfillment === '送货') &&
    normalizeWhatsApp(input.whatsapp).length >= 8 &&
    missingOrderFields(input).length === 0
  )
}
