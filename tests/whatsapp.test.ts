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
        '你好，我要订蛋糕：',
        '巧克力蛋糕 6寸 x1',
        '杯子蛋糕（6个） x2',
        '合计 RM 128',
        '',
        '名字：Mei Ling',
        '电话：012-3456789',
        '日期：11月16日 周一',
        '方式：自取',
        '订单 #A1B2',
      ].join('\n'),
    )
  })

  it('formats other weekdays and keeps a fractional total', () => {
    expect(formatPickupDate('2026-11-15')).toBe('11月15日 周日')
    expect(formatPickupDate('2026-01-01')).toBe('1月1日 周四')
    const message = buildWhatsAppMessage({
      items: [{ name: '班兰戚风', qty: 1 }],
      total: lineTotal([{ price: 10.5, qty: 1 }]),
      customerName: 'Ahmad',
      phone: '016-2223333',
      pickupDate: '2026-11-15',
      fulfillment: '送货',
      orderNo: '#SY16',
    })
    expect(message).toContain('合计 RM 10.50')
    expect(message).toContain('日期：11月15日 周日')
    expect(message).toContain('方式：送货')
    expect(message).toContain('订单 #SY16')
    expect(message).not.toContain('订单 ##')
    expect(message).not.toContain('已付款，收据已上传')
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
    expect(message.endsWith('订单 #A1B2\n已付款，收据已上传')).toBe(true)
  })
})

describe('whatsAppUrl', () => {
  it('strips the shop number and encodes the message', () => {
    expect(normalizeWhatsApp('+60 12-345 6789')).toBe('60123456789')
    const url = whatsAppUrl('60 12-345 6789', '你好\n合计 RM 68')
    expect(url).toBe(`https://wa.me/60123456789?text=${encodeURIComponent('你好\n合计 RM 68')}`)
  })
})
