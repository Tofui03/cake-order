<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import CakePic from '../components/CakePic.vue'
import { getApi } from '../lib/api'
import { isOnOrAfter, tomorrowIso } from '../lib/dates'
import { formatRm, lineTotal } from '../lib/money'
import { makeOrderNo } from '../lib/orderNo'
import type { Fulfillment, OrderItem } from '../lib/types'
import { buildWhatsAppMessage, normalizeWhatsApp, whatsAppUrl } from '../lib/whatsapp'
import { useCatalog } from '../state/catalog'

const { cakes, settings, ready, catalogError, load } = useCatalog()

const qty = reactive<Record<string, number>>({})
const name = ref('')
const phone = ref('')
const date = ref('')
const way = ref<Fulfillment>('自取')
const submitting = ref(false)
const submitError = ref('')

const total = computed(() =>
  lineTotal(cakes.value.map((cake) => ({ price: cake.price, qty: qty[cake.id] ?? 0 }))),
)

const buttonLabel = computed(() =>
  total.value > 0 ? `用 WhatsApp 下单 · RM ${formatRm(total.value)}` : '用 WhatsApp 下单',
)

const canSubmit = computed(() => {
  return (
    ready.value &&
    !submitting.value &&
    total.value > 0 &&
    name.value.trim().length > 0 &&
    phone.value.trim().length > 0 &&
    isOnOrAfter(date.value, tomorrowIso()) &&
    (way.value === '自取' || way.value === '送货') &&
    normalizeWhatsApp(settings.value.whatsapp).length >= 8
  )
})

function changeQty(id: string, delta: number): void {
  const next = Math.max(0, (qty[id] ?? 0) + delta)
  if (next === 0) delete qty[id]
  else qty[id] = next
  submitError.value = ''
}

function reset(): void {
  name.value = ''
  phone.value = ''
  date.value = ''
  way.value = '自取'
  for (const key of Object.keys(qty)) delete qty[key]
}

function openWhatsApp(url: string, popup: Window | null): void {
  if (popup) {
    try {
      popup.opener = null
    } catch {
      /* The opened tab can keep its opener. */
    }
    popup.location.href = url
    return
  }
  window.location.assign(url)
}

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  submitError.value = ''
  const popup = window.open('', '_blank')
  try {
    const items: OrderItem[] = cakes.value
      .filter((cake) => (qty[cake.id] ?? 0) > 0)
      .map((cake) => ({
        cakeId: cake.id,
        name: cake.name,
        qty: qty[cake.id] ?? 0,
        price: cake.price,
      }))
    const orderTotal = lineTotal(items)
    const orderNo = makeOrderNo()
    const customerName = name.value.trim()
    const customerPhone = phone.value.trim()
    const pickupDate = date.value
    const fulfillment = way.value
    await getApi().createOrder({
      orderNo,
      customerName,
      phone: customerPhone,
      pickupDate,
      fulfillment,
      items,
      total: orderTotal,
    })
    const message = buildWhatsAppMessage({
      items,
      total: orderTotal,
      customerName,
      phone: customerPhone,
      pickupDate,
      fulfillment,
      orderNo,
    })
    openWhatsApp(whatsAppUrl(settings.value.whatsapp, message), popup)
    reset()
  } catch (error) {
    console.error(error)
    popup?.close()
    submitError.value = '下单失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="shop-screen">
    <main class="main shop">
      <p v-if="catalogError && !ready" class="empty">加载失败</p>
      <button v-if="catalogError && !ready" class="btn retry" type="button" @click="load(false)">重试</button>
      <template v-else-if="ready">
        <p v-if="cakes.length === 0" class="empty">还没有蛋糕</p>
        <div v-for="cake in cakes" :key="cake.id" class="item">
          <CakePic :emoji="cake.emoji" :color="cake.color" :photo-url="cake.photoUrl" />
          <div class="info">
            <div class="name">{{ cake.name }}</div>
            <div class="price">RM {{ formatRm(cake.price) }}</div>
          </div>
          <div class="qty">
            <button
              v-if="qty[cake.id]"
              type="button"
              :aria-label="`减少 ${cake.name}`"
              @click="changeQty(cake.id, -1)"
            >
              −
            </button>
            <span v-if="qty[cake.id]">{{ qty[cake.id] }}</span>
            <button class="add" type="button" :aria-label="`增加 ${cake.name}`" @click="changeQty(cake.id, 1)">
              +
            </button>
          </div>
        </div>

        <div class="fields">
          <label for="customer-name">名字</label>
          <input id="customer-name" v-model="name" maxlength="40" autocomplete="name" @input="submitError = ''" />
          <label for="customer-phone">电话</label>
          <input
            id="customer-phone"
            v-model="phone"
            type="tel"
            maxlength="30"
            inputmode="tel"
            autocomplete="tel"
            @input="submitError = ''"
          />
          <label for="pickup-date">取货日期</label>
          <input
            id="pickup-date"
            v-model="date"
            type="date"
            :min="tomorrowIso()"
            @change="submitError = ''"
          />
          <label>方式</label>
          <div class="pick">
            <button type="button" :class="{ on: way === '自取' }" @click="way = '自取'">自取</button>
            <button type="button" :class="{ on: way === '送货' }" @click="way = '送货'">送货</button>
          </div>
        </div>
      </template>
    </main>
    <div class="bar">
      <p v-if="submitError" class="error">{{ submitError }}</p>
      <button class="btn wa" type="button" :disabled="!canSubmit" @click="submit">{{ buttonLabel }}</button>
    </div>
  </div>
</template>
