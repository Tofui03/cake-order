import { describe, expect, it } from 'vitest'
import { dailyBakeCounts, ordersByDate, type BakeOrder } from '../src/lib/aggregate'
import type { OrderStatus } from '../src/lib/types'

function order(
  status: OrderStatus,
  pickupDate: string,
  items: BakeOrder['items'],
  createdAt = '2026-11-15T00:00:00.000Z',
): BakeOrder & { createdAt: string } {
  return { status, pickupDate, items, createdAt }
}

const choc = (qty: number) => ({ cakeId: 'choc', name: '巧克力蛋糕 6寸', qty })
const cup = (qty: number) => ({ cakeId: 'cup', name: '杯子蛋糕（6个）', qty })
const cheese = (qty: number) => ({ cakeId: 'cheese', name: '芝士蛋糕 6寸', qty })

describe('dailyBakeCounts', () => {
  it('sums 已确认 quantities per cake and groups by date ascending', () => {
    const counts = dailyBakeCounts([
      order('已确认', '2026-11-18', [choc(1), cup(2)]),
      order('已确认', '2026-11-16', [choc(1)]),
      order('已确认', '2026-11-16', [choc(2), cheese(1)]),
    ])

    expect(counts).toEqual([
      {
        date: '2026-11-16',
        counts: [
          { cakeId: 'cheese', name: '芝士蛋糕 6寸', qty: 1 },
          { cakeId: 'choc', name: '巧克力蛋糕 6寸', qty: 3 },
        ],
      },
      {
        date: '2026-11-18',
        counts: [
          { cakeId: 'choc', name: '巧克力蛋糕 6寸', qty: 1 },
          { cakeId: 'cup', name: '杯子蛋糕（6个）', qty: 2 },
        ],
      },
    ])
  })

  it('ignores 待确认, 已完成, and 取消, including large cancelled quantities', () => {
    const counts = dailyBakeCounts([
      order('已确认', '2026-11-16', [choc(1)]),
      order('待确认', '2026-11-16', [choc(9), cheese(4)]),
      order('已完成', '2026-11-16', [cup(6)]),
      order('取消', '2026-11-16', [choc(100), cheese(50)]),
      order('取消', '2026-11-17', [cup(8)]),
      order('待确认', '2026-11-17', [cheese(2)]),
    ])

    expect(counts).toEqual([
      {
        date: '2026-11-16',
        counts: [{ cakeId: 'choc', name: '巧克力蛋糕 6寸', qty: 1 }],
      },
    ])
  })

  it('drops non-positive quantities and returns nothing when nothing is confirmed', () => {
    expect(dailyBakeCounts([order('已确认', '2026-11-16', [choc(0), cup(-1)])])).toEqual([])
    expect(dailyBakeCounts([])).toEqual([])
  })
})

describe('ordersByDate', () => {
  it('lists pending orders but hides cancelled ones', () => {
    const groups = ordersByDate([
      order('取消', '2026-11-16', [choc(1)], '2026-11-15T01:00:00.000Z'),
      order('已确认', '2026-11-16', [choc(1)], '2026-11-15T02:00:00.000Z'),
      order('待确认', '2026-11-16', [cheese(1)], '2026-11-15T03:00:00.000Z'),
      order('待确认', '2026-11-18', [cup(1)], '2026-11-15T04:00:00.000Z'),
    ])

    expect(groups.map((group) => group.date)).toEqual(['2026-11-16', '2026-11-18'])
    expect(groups[0]?.orders.map((entry) => entry.status)).toEqual(['待确认', '已确认'])
    expect(groups[1]?.orders).toHaveLength(1)
  })
})
