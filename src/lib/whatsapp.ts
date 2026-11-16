import { formatPickupDate } from './dates'
import { formatRm } from './money'
import type { Fulfillment } from './types'

export interface WhatsAppMessageInput {
  items: readonly { name: string; qty: number }[]
  total: number
  customerName: string
  phone: string
  pickupDate: string
  fulfillment: Fulfillment
  /** Short code without a hash, e.g. A1B2. */
  orderNo: string
  /** True after the receipt has been stored. */
  paid?: boolean
}

export function normalizeWhatsApp(input: string): string {
  return input.replace(/\D/g, '')
}

export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const lines = input.items
    .filter((item) => item.qty > 0)
    .map((item) => `${item.name} x${item.qty}`)
    .join('\n')
  const orderNo = input.orderNo.replace(/^#/, '')
  const fulfillmentLabel = input.fulfillment === '送货' ? 'Delivery' : 'Pickup'
  const message = [
    'Hi, I would like to order:',
    lines,
    `Total: RM ${formatRm(input.total)}`,
    '',
    `Name: ${input.customerName}`,
    `Phone: ${input.phone}`,
    `Date: ${formatPickupDate(input.pickupDate)}`,
    `Method: ${fulfillmentLabel}`,
    `Order #${orderNo}`,
  ]
  if (input.paid) message.push('Paid, receipt uploaded')
  return message.join('\n')
}

export function whatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsApp(phone)}?text=${encodeURIComponent(message)}`
}
