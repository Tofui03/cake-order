export function lineTotal(items: readonly { price: number; qty: number }[]): number {
  const cents = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.qty, 0)
  return cents / 100
}

export function formatRm(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2)
}
