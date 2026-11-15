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
  const message = [
    '你好，我要订蛋糕：',
    lines,
    `合计 RM ${formatRm(input.total)}`,
    '',
    `名字：${input.customerName}`,
    `电话：${input.phone}`,
    `日期：${formatPickupDate(input.pickupDate)}`,
    `方式：${input.fulfillment}`,
    `订单 #${orderNo}`,
  ]
  if (input.paid) message.push('已付款，收据已上传')
  return message.join('\n')
}

export function whatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsApp(phone)}?text=${encodeURIComponent(message)}`
}
