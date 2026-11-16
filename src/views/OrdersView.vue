<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { dailyBakeCounts, ordersByDate, sortCounts } from '../lib/aggregate'
import { getApi } from '../lib/api'
import { formatPickupDate, todayIso } from '../lib/dates'
import { formatRm } from '../lib/money'
import type { Order, OrderStatus } from '../lib/types'
import { normalizeWhatsApp } from '../lib/whatsapp'
import { useCatalog } from '../state/catalog'

const { cakes, load } = useCatalog()
const orders = ref<Order[]>([])
const loaded = ref(false)
const error = ref('')
const busyId = ref<string | null>(null)
const showPast = ref(false)
const receiptModal = ref<{ order: Order; url: string } | null>(null)

onMounted(async () => {
  try {
    await load(true)
    orders.value = await getApi().fetchOrders()
    loaded.value = true
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load'
  }
})

const days = computed(() => {
  const grouped = ordersByDate(orders.value)
  const bakes = new Map(dailyBakeCounts(orders.value).map((day) => [day.date, day.counts]))
  return grouped.map((group) => ({
    date: group.date,
    label: formatPickupDate(group.date),
    orders: group.orders,
    pendingCount: group.orders.filter((o) => o.status === '待确认').length,
    hasOpen: group.orders.some((o) => o.status === '待确认' || o.status === '已确认'),
    counts: sortCounts(bakes.get(group.date) ?? [], cakes.value),
  }))
})

const today = computed(() => todayIso())
const activeDays = computed(() => days.value.filter((d) => d.date >= today.value || d.hasOpen))
const pastDays = computed(() => days.value.filter((d) => d.date < today.value && !d.hasOpen))

function summary(order: Order): string {
  return order.items.map((item) => `${item.name} x${item.qty}`).join(', ')
}

function fulfillmentLabel(fulfillment: Order['fulfillment']): string {
  return fulfillment === '送货' ? 'Delivery' : 'Pickup'
}

function statusLabel(status: OrderStatus): string {
  if (status === '已确认') return 'Confirmed'
  if (status === '已完成') return 'Completed'
  if (status === '取消') return 'Cancelled'
  return 'Pending'
}

function chipClass(status: OrderStatus): string {
  if (status === '已确认') return 'tag ok'
  if (status === '已完成') return 'tag done'
  return 'tag'
}

function emojiFor(cakeId: string): string {
  return cakes.value.find((cake) => cake.id === cakeId)?.emoji ?? '🎂'
}

async function openReceipt(order: Order): Promise<void> {
  if (!order.receiptPath) return
  error.value = ''
  try {
    const url = await getApi().receiptUrl(order.receiptPath)
    receiptModal.value = { order, url }
  } catch (err) {
    console.error(err)
    error.value = 'Could not open receipt'
  }
}

function phoneHref(phone: string): string {
  const digits = normalizeWhatsApp(phone)
  return digits.length >= 8 ? `https://wa.me/${digits}` : `tel:${phone}`
}

async function setStatus(id: string, status: OrderStatus): Promise<void> {
  if (busyId.value) return
  if (status === '取消' && !window.confirm('Cancel this order? It will no longer be shown.')) return
  if (status === '已完成' && !window.confirm('Mark this order as delivered/completed?')) return
  const previous = orders.value
  busyId.value = id
  error.value = ''
  orders.value = orders.value.map((order) => (order.id === id ? { ...order, status } : order))
  try {
    await getApi().setOrderStatus(id, status)
  } catch (err) {
    console.error(err)
    orders.value = previous
    error.value = 'Failed to save'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <main class="main">
    <p v-if="!loaded && !error" class="empty">Loading…</p>
    <p v-else-if="error && !loaded" class="empty">Failed to load</p>
    <p v-else-if="loaded && days.length === 0" class="empty">No orders yet</p>
    <p v-if="error && loaded" class="error">{{ error }}</p>
    <section v-for="day in activeDays" :key="day.date" class="day">
      <h2>{{ day.label }} · To Bake</h2>
      <div class="card">
        <div v-if="day.counts.length === 0" class="row muted-row">No confirmed orders yet</div>
        <div v-for="count in day.counts" :key="count.cakeId" class="row">
          <span>{{ emojiFor(count.cakeId) }} {{ count.name }}</span>
          <b>{{ count.qty }}</b>
        </div>
        <div v-if="day.pendingCount > 0" class="row pending-note">
          <span>{{ day.pendingCount }} pending order(s) (not counted in To Bake)</span>
        </div>
      </div>
      <article v-for="order in day.orders" :key="order.id" class="order">
        <div class="top">
          <span>{{ order.customerName }} · {{ fulfillmentLabel(order.fulfillment) }}</span>
          <span :class="chipClass(order.status)">{{ statusLabel(order.status) }}</span>
        </div>
        <div class="sub">{{ summary(order) }}</div>
        <div class="sub">
          <a class="phone-link" :href="phoneHref(order.phone)" target="_blank" rel="noopener noreferrer">{{ order.phone }}</a>
        </div>
        <div class="orderno">Order #{{ order.orderNo }} · RM {{ formatRm(order.total) }}</div>
        <button v-if="order.receiptPath" class="receipt" type="button" @click="openReceipt(order)">View Receipt</button>
        <div v-if="order.status === '待确认' || order.status === '已确认'" class="acts">
          <template v-if="order.status === '待确认'">
            <button type="button" :disabled="busyId === order.id" @click="setStatus(order.id, '已确认')">Confirm</button>
            <button type="button" :disabled="busyId === order.id" @click="setStatus(order.id, '取消')">Cancel</button>
          </template>
          <button
            v-else
            type="button"
            :disabled="busyId === order.id"
            @click="setStatus(order.id, '已完成')"
          >
            Delivered
          </button>
        </div>
      </article>
    </section>

    <div v-if="pastDays.length > 0" class="past-wrap">
      <button class="btn ghost" type="button" @click="showPast = !showPast">
        {{ showPast ? 'Hide Past Orders' : `View Past Completed (${pastDays.length}d)` }}
      </button>
      <section v-for="day in showPast ? pastDays : []" :key="day.date" class="day">
        <h2>{{ day.label }} · Past</h2>
        <article v-for="order in day.orders" :key="order.id" class="order">
          <div class="top">
            <span>{{ order.customerName }} · {{ fulfillmentLabel(order.fulfillment) }}</span>
            <span :class="chipClass(order.status)">{{ statusLabel(order.status) }}</span>
          </div>
          <div class="sub">{{ summary(order) }}</div>
          <div class="orderno">Order #{{ order.orderNo }} · RM {{ formatRm(order.total) }}</div>
          <button v-if="order.receiptPath" class="receipt" type="button" @click="openReceipt(order)">View Receipt</button>
        </article>
      </section>
    </div>

    <div v-if="receiptModal" class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Receipt details" @click.self="receiptModal = null">
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <div class="modal-title">{{ receiptModal.order.customerName }} · #{{ receiptModal.order.orderNo }}</div>
            <div class="modal-sub">Due RM {{ formatRm(receiptModal.order.total) }}</div>
          </div>
          <button class="text-btn" type="button" @click="receiptModal = null">Close</button>
        </div>
        <img class="modal-img" :src="receiptModal.url" alt="Payment receipt" />
      </div>
    </div>
  </main>
</template>
