<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import CakePic from '../components/CakePic.vue'
import { getApi } from '../lib/api'
import { canPlaceOrder } from '../lib/canSubmit'
import { tomorrowIso } from '../lib/dates'
import { formatRm, lineTotal } from '../lib/money'
import { makeOrderNo } from '../lib/orderNo'
import { receiptProblem } from '../lib/photos'
import type { Fulfillment, OrderItem } from '../lib/types'
import { buildWhatsAppMessage, whatsAppUrl } from '../lib/whatsapp'
import { useCatalog } from '../state/catalog'

const { cakes, settings, ready, catalogError, load } = useCatalog()

const qty = reactive<Record<string, number>>({})
const name = ref('')
const phone = ref('')
const date = ref('')
const way = ref<Fulfillment>('自取')
const submitting = ref(false)
const submitError = ref('')
const receiptFile = ref<File | null>(null)
const receiptPreview = ref<string | null>(null)

const needsReceipt = computed(() => Boolean(settings.value.duitnowQrUrl?.trim()))

const total = computed(() =>
  lineTotal(cakes.value.map((cake) => ({ price: cake.price, qty: qty[cake.id] ?? 0 }))),
)

const buttonLabel = computed(() =>
  total.value > 0 ? `用 WhatsApp 下单 · RM ${formatRm(total.value)}` : '用 WhatsApp 下单',
)

const canSubmit = computed(() =>
  canPlaceOrder({
    ready: ready.value,
    submitting: submitting.value,
    total: total.value,
    name: name.value,
    phone: phone.value,
    pickupDate: date.value,
    fulfillment: way.value,
    whatsapp: settings.value.whatsapp,
    paymentRequired: needsReceipt.value,
    hasReceipt: receiptFile.value !== null,
  }),
)

function changeQty(id: string, delta: number): void {
  const next = Math.max(0, (qty[id] ?? 0) + delta)
  if (next === 0) delete qty[id]
  else qty[id] = next
  submitError.value = ''
}

function setReceipt(file: File | null): void {
  if (receiptPreview.value) URL.revokeObjectURL(receiptPreview.value)
  receiptFile.value = file
  receiptPreview.value = file ? URL.createObjectURL(file) : null
}

function onReceipt(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  submitError.value = ''
  if (!file) return
  const issue = receiptProblem(file)
  if (issue) {
    setReceipt(null)
    submitError.value = issue
    return
  }
  setReceipt(file)
}

function reset(): void {
  name.value = ''
  phone.value = ''
  date.value = ''
  way.value = '自取'
  setReceipt(null)
  for (const key of Object.keys(qty)) delete qty[key]
}

onUnmounted(() => {
  if (receiptPreview.value) URL.revokeObjectURL(receiptPreview.value)
})

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
    const file = receiptFile.value
    const receiptPath = needsReceipt.value && file ? await getApi().uploadReceipt(orderNo, file) : null
    await getApi().createOrder({
      orderNo,
      customerName,
      phone: customerPhone,
      pickupDate,
      fulfillment,
      items,
      total: orderTotal,
      receiptPath,
    })
    const message = buildWhatsAppMessage({
      items,
      total: orderTotal,
      customerName,
      phone: customerPhone,
      pickupDate,
      fulfillment,
      orderNo,
      paid: Boolean(receiptPath),
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
        <div v-if="needsReceipt" class="pay">
          <img class="qr" :src="settings.duitnowQrUrl ?? ''" alt="" />
          <p class="pay-line">请先转账 RM {{ formatRm(total) }}</p>
          <label class="file">
            收据
            <input type="file" accept="image/*" @change="onReceipt" />
          </label>
          <img v-if="receiptPreview" class="thumb" :src="receiptPreview" alt="" />
        </div>
      </template>
    </main>
    <div class="bar">
      <p v-if="submitError" class="error">{{ submitError }}</p>
      <button class="btn wa" type="button" :disabled="!canSubmit" @click="submit">{{ buttonLabel }}</button>
    </div>
  </div>
</template>
