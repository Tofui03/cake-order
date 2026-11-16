import { describe, expect, it } from 'vitest'
import { canPlaceOrder, missingOrderFields, type PlaceOrderInput } from '../src/lib/canSubmit'

const now = new Date(2026, 10, 15)

function input(overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    ready: true,
    submitting: false,
    total: 68,
    name: 'Mei Ling',
    phone: '012-3456789',
    pickupDate: '2026-11-16',
    fulfillment: '自取',
    whatsapp: '60123456789',
    paymentRequired: false,
    hasReceipt: false,
    now,
    ...overrides,
  }
}

describe('canPlaceOrder', () => {
  it('allows an order when no DuitNow QR is set', () => {
    expect(canPlaceOrder(input())).toBe(true)
  })

  it('stays closed until a receipt is chosen', () => {
    expect(canPlaceOrder(input({ paymentRequired: true, hasReceipt: false }))).toBe(false)
    expect(canPlaceOrder(input({ paymentRequired: true, hasReceipt: true }))).toBe(true)
  })

  it('still requires the rest of the form when a receipt is chosen', () => {
    expect(canPlaceOrder(input({ paymentRequired: true, hasReceipt: true, name: '  ' }))).toBe(false)
    expect(canPlaceOrder(input({ paymentRequired: true, hasReceipt: true, phone: '123' }))).toBe(false)
    expect(canPlaceOrder(input({ paymentRequired: true, hasReceipt: true, pickupDate: '2026-11-15' }))).toBe(false)
    expect(canPlaceOrder(input({ paymentRequired: true, hasReceipt: true, submitting: true }))).toBe(false)
  })

  it('lists missing fields in user-facing order', () => {
    expect(
      missingOrderFields(
        input({
          total: 0,
          name: '',
          phone: '12',
          pickupDate: '',
          paymentRequired: true,
          hasReceipt: false,
        }),
      ),
    ).toEqual(['select a cake', 'your name', 'valid phone', 'pickup date', 'payment receipt'])
  })
})