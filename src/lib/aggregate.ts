import type { OrderStatus } from './types'

export interface BakeItem {
  cakeId: string
  name: string
  qty: number
}

export interface BakeOrder {
  status: OrderStatus
  pickupDate: string
  items: readonly BakeItem[]
}

export interface BakeCount {
  cakeId: string
  name: string
  qty: number
}

export interface DayBake {
  date: string
  counts: BakeCount[]
}

/**
 * Quantities mum still has to bake.
 * Only 已确认 orders count. 待确认, 已完成, and 取消 are ignored.
 * Dates are ascending. Cakes inside a date are summed by id.
 */
export function dailyBakeCounts(orders: readonly BakeOrder[]): DayBake[] {
  const byDate = new Map<string, Map<string, BakeCount>>()

  for (const order of orders) {
    if (order.status !== '已确认') continue
    let cakes = byDate.get(order.pickupDate)
    if (!cakes) {
      cakes = new Map()
      byDate.set(order.pickupDate, cakes)
    }
    for (const item of order.items) {
      if (item.qty <= 0) continue
      const existing = cakes.get(item.cakeId)
      if (existing) {
        existing.qty += item.qty
      } else {
        cakes.set(item.cakeId, { cakeId: item.cakeId, name: item.name, qty: item.qty })
      }
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, cakes]) => {
      const counts = [...cakes.values()].sort((a, b) => a.cakeId.localeCompare(b.cakeId))
      if (counts.length === 0) return []
      return [{ date, counts }]
    })
}

const STATUS_RANK: Record<OrderStatus, number> = {
  待确认: 0,
  已确认: 1,
  已完成: 2,
  取消: 3,
}

export function ordersByDate<T extends { status: OrderStatus; pickupDate: string; createdAt: string }>(
  orders: readonly T[],
): { date: string; orders: T[] }[] {
  const grouped = new Map<string, T[]>()
  for (const order of orders) {
    if (order.status === '取消') continue
    const list = grouped.get(order.pickupDate)
    if (list) list.push(order)
    else grouped.set(order.pickupDate, [order])
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      orders: [...list].sort(
        (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.createdAt.localeCompare(b.createdAt),
      ),
    }))
}

export function sortCounts(counts: readonly BakeCount[], menu: readonly { id: string; sortOrder: number }[]): BakeCount[] {
  const rank = new Map(menu.map((cake) => [cake.id, cake.sortOrder]))
  return [...counts].sort((a, b) => {
    const left = rank.get(a.cakeId) ?? Number.MAX_SAFE_INTEGER
    const right = rank.get(b.cakeId) ?? Number.MAX_SAFE_INTEGER
    if (left !== right) return left - right
    return a.name.localeCompare(b.name, 'zh')
  })
}
