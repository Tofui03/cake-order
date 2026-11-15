<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { dailyBakeCounts, ordersByDate, sortCounts } from '../lib/aggregate'
import { getApi } from '../lib/api'
import { formatPickupDate } from '../lib/dates'
import type { Order, OrderStatus } from '../lib/types'
import { useCatalog } from '../state/catalog'

const { cakes, load } = useCatalog()
const orders = ref<Order[]>([])
const loaded = ref(false)
const error = ref('')
const busyId = ref<string | null>(null)

onMounted(async () => {
  try {
    await load(true)
    orders.value = await getApi().fetchOrders()
    loaded.value = true
  } catch (err) {
    console.error(err)
    error.value = '加载失败'
  }
})

const days = computed(() => {
  const grouped = ordersByDate(orders.value)
  const bakes = new Map(dailyBakeCounts(orders.value).map((day) => [day.date, day.counts]))
  return grouped.map((group) => ({
    date: group.date,
    label: formatPickupDate(group.date),
    orders: group.orders,
    counts: sortCounts(bakes.get(group.date) ?? [], cakes.value),
  }))
})

function summary(order: Order): string {
  return order.items.map((item) => `${item.name} x${item.qty}`).join('，')
}

function chipClass(status: OrderStatus): string {
  if (status === '已确认') return 'tag ok'
  if (status === '已完成') return 'tag done'
  return 'tag'
}

function emojiFor(cakeId: string): string {
  return cakes.value.find((cake) => cake.id === cakeId)?.emoji ?? '🎂'
}

async function setStatus(id: string, status: OrderStatus): Promise<void> {
  if (busyId.value) return
  const previous = orders.value
  busyId.value = id
  error.value = ''
  orders.value = orders.value.map((order) => (order.id === id ? { ...order, status } : order))
  try {
    await getApi().setOrderStatus(id, status)
  } catch (err) {
    console.error(err)
    orders.value = previous
    error.value = '没有保存'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <main class="main">
    <p v-if="error && !loaded" class="empty">加载失败</p>
    <p v-else-if="loaded && days.length === 0" class="empty">还没有订单</p>
    <p v-if="error && loaded" class="error">{{ error }}</p>
    <section v-for="day in days" :key="day.date" class="day">
      <h2>{{ day.label }} · 要做</h2>
      <div class="card">
        <div v-if="day.counts.length === 0" class="row muted-row">还没有已确认的订单</div>
        <div v-for="count in day.counts" :key="count.cakeId" class="row">
          <span>{{ emojiFor(count.cakeId) }} {{ count.name }}</span>
          <b>{{ count.qty }}</b>
        </div>
      </div>
      <article v-for="order in day.orders" :key="order.id" class="order">
        <div class="top">
          <span>{{ order.customerName }} · {{ order.fulfillment }}</span>
          <span :class="chipClass(order.status)">{{ order.status }}</span>
        </div>
        <div class="sub">{{ summary(order) }}</div>
        <div class="sub">{{ order.phone }}</div>
        <div class="orderno">订单 #{{ order.orderNo }}</div>
        <div v-if="order.status === '待确认' || order.status === '已确认'" class="acts">
          <template v-if="order.status === '待确认'">
            <button type="button" :disabled="busyId === order.id" @click="setStatus(order.id, '已确认')">确认</button>
            <button type="button" :disabled="busyId === order.id" @click="setStatus(order.id, '取消')">取消</button>
          </template>
          <button
            v-else
            type="button"
            :disabled="busyId === order.id"
            @click="setStatus(order.id, '已完成')"
          >
            已交货
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
