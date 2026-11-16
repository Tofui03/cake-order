import { describe, expect, it } from 'vitest'
import { formatPickupDate } from '../src/lib/dates'
import { lineTotal } from '../src/lib/money'
import { buildWhatsAppMessage, normalizeWhatsApp, whatsAppUrl } from '../src/lib/whatsapp'

describe('buildWhatsAppMessage', () => {
  it('builds the order message with a date and order number', () => {
    const items = [
      { name: '巧克力蛋糕 6寸', qty: 1 },
      { name: '杯子蛋糕（6个）', qty: 2 },
    ]
    const total = lineTotal([
      { price: 68, qty: 1 },
      { price: 30, qty: 2 },
    ])
    const message = buildWhatsAppMessage({
      items,
      total,
      customerName: 'Mei Ling',
      phone: '012-3456789',
      pickupDate: '2026-11-16',
      fulfillment: '自取',
      orderNo: 'A1B2',
    })

    expect(message).toBe(
      [
        'Hi, I would like to order:',
        '巧克力蛋糕 6寸 x1',
        '杯子蛋糕（6个） x2',
        'Total: RM 128',
        '',
        'Name: Mei Ling',
        'Phone: 012-3456789',
        'Date: Mon, 16 Nov',
        'Method: Pickup',
        'Order #A1B2',
      ].join('\n'),
    )
  })

  it('formats other weekdays and keeps a fractional total', () => {
    expect(formatPickupDate('2026-11-15')).toBe('Sun, 15 Nov')
    expect(formatPickupDate('2026-01-01')).toBe('Thu, 1 Jan')
    const message = buildWhatsAppMessage({
      items: [{ name: '班兰戚风', qty: 1 }],
      total: lineTotal([{ price: 10.5, qty: 1 }]),
      customerName: 'Ahmad',
      phone: '016-2223333',
      pickupDate: '2026-11-15',
      fulfillment: '送货',
      orderNo: '#SY16',
    })
    expect(message).toContain('Total: RM 10.50')
    expect(message).toContain('Date: Sun, 15 Nov')
    expect(message).toContain('Method: Delivery')
    expect(message).toContain('Order #SY16')
    expect(message).not.toContain('Order ##')
    expect(message).not.toContain('Paid, receipt uploaded')
  })

  it('adds a paid line after the receipt is stored', () => {
    const message = buildWhatsAppMessage({
      items: [{ name: '巧克力蛋糕 6寸', qty: 1 }],
      total: 68,
      customerName: 'Mei Ling',
      phone: '012-3456789',
      pickupDate: '2026-11-16',
      fulfillment: '自取',
      orderNo: 'A1B2',
      paid: true,
    })
    expect(message.endsWith('Order #A1B2\nPaid, receipt uploaded')).toBe(true)
  })
})

describe('whatsAppUrl', () => {
  it('strips the shop number and encodes the message', () => {
    expect(normalizeWhatsApp('+60 12-345 6789')).toBe('60123456789')
    const url = whatsAppUrl('60 12-345 6789', '你好\n合计 RM 68')
    expect(url).toBe(`https://wa.me/60123456789?text=${encodeURIComponent('你好\n合计 RM 68')}`)
  })
})
