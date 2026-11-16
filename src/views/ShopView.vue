<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import CakePic from '../components/CakePic.vue'
import { getApi } from '../lib/api'
import { canPlaceOrder, missingOrderFields } from '../lib/canSubmit'
import { quickPickupOptions, tomorrowIso } from '../lib/dates'
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
const submittedOrder = ref<{ orderNo: string; total: number; waUrl: string } | null>(null)

const needsReceipt = computed(() => Boolean(settings.value.duitnowQrUrl?.trim()))
const dateOptions = computed(() => quickPickupOptions())
const selectedItems = computed(() =>
  cakes.value
    .filter((cake) => (qty[cake.id] ?? 0) > 0)
    .map((cake) => ({
      id: cake.id,
      name: cake.name,
      qty: qty[cake.id] ?? 0,
      subtotal: cake.price * (qty[cake.id] ?? 0),
    })),
)

const total = computed(() =>
  lineTotal(cakes.value.map((cake) => ({ price: cake.price, qty: qty[cake.id] ?? 0 }))),
)

const buttonLabel = computed(() =>
  total.value > 0 ? `Order via WhatsApp · RM ${formatRm(total.value)}` : 'Order via WhatsApp',
)

const orderInput = computed(() => ({
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
}))

const canSubmit = computed(() => canPlaceOrder(orderInput.value))
const missingHint = computed(() => {
  if (!ready.value || submitting.value || total.value <= 0) return ''
  const missing = missingOrderFields(orderInput.value)
  return missing.length > 0 ? `Missing: ${missing.join(', ')}` : ''
})

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
    const url = whatsAppUrl(settings.value.whatsapp, message)
    submittedOrder.value = { orderNo, total: orderTotal, waUrl: url }
    openWhatsApp(url, popup)
    reset()
  } catch (error) {
    console.error(error)
    popup?.close()
    submitError.value = 'Failed to place order. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="shop-screen">
    <main class="main shop">
      <p v-if="!ready && !catalogError" class="empty">Loading…</p>
      <p v-else-if="catalogError && !ready" class="empty">Failed to load</p>
      <button v-if="catalogError && !ready" class="btn retry" type="button" @click="load(false)">Retry</button>
      <div v-else-if="submittedOrder" class="card confirm-card">
        <p class="confirm-title">Order #{{ submittedOrder.orderNo }} recorded</p>
        <p class="confirm-sub">Total RM {{ formatRm(submittedOrder.total) }}. If WhatsApp didn't open automatically, tap below to send.</p>
        <a class="btn wa confirm-wa" :href="submittedOrder.waUrl" target="_blank" rel="noopener noreferrer">
          Open WhatsApp to Send
        </a>
        <button class="btn ghost" type="button" @click="submittedOrder = null">Place Another Order</button>
      </div>
      <template v-else-if="ready">
        <p v-if="cakes.length === 0" class="empty">No cakes available yet</p>
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
              :aria-label="`Decrease ${cake.name}`"
              @click="changeQty(cake.id, -1)"
            >
              −
            </button>
            <span v-if="qty[cake.id]">{{ qty[cake.id] }}</span>
            <button class="add" type="button" :aria-label="`Increase ${cake.name}`" @click="changeQty(cake.id, 1)">
              +
            </button>
          </div>
        </div>

        <div class="fields">
          <label for="customer-name">Name</label>
          <input id="customer-name" v-model="name" maxlength="40" autocomplete="name" @input="submitError = ''" />
          <label for="customer-phone">Phone</label>
          <input
            id="customer-phone"
            v-model="phone"
            type="tel"
            maxlength="30"
            inputmode="tel"
            autocomplete="tel"
            @input="submitError = ''"
          />
          <label for="pickup-date">Pickup Date</label>
          <div class="date-chips">
            <button
              v-for="opt in dateOptions"
              :key="opt.iso"
              type="button"
              :class="{ on: date === opt.iso }"
              @click="date = opt.iso; submitError = ''"
            >
              {{ opt.label }}
            </button>
          </div>
          <input
            id="pickup-date"
            v-model="date"
            type="date"
            :min="tomorrowIso()"
            @change="submitError = ''"
          />
          <label>Method</label>
          <div class="pick">
            <button type="button" :class="{ on: way === '自取' }" @click="way = '自取'">Pickup</button>
            <button type="button" :class="{ on: way === '送货' }" @click="way = '送货'">Delivery</button>
          </div>
        </div>
        <div v-if="needsReceipt && total > 0" class="pay">
          <div class="card recap">
            <div v-for="item in selectedItems" :key="item.id" class="row">
              <span>{{ item.name }} ×{{ item.qty }}</span>
              <span>RM {{ formatRm(item.subtotal) }}</span>
            </div>
          </div>
          <img class="qr" :src="settings.duitnowQrUrl ?? ''" alt="DuitNow QR" />
          <a class="btn ghost qr-save" :href="settings.duitnowQrUrl ?? ''" download="duitnow-qr.png">Save QR Code</a>
          <p class="pay-line">Please transfer RM {{ formatRm(total) }} first</p>
          <label class="file">
            {{ receiptPreview ? 'Change Receipt' : 'Upload Receipt' }}
            <input type="file" accept="image/*" @change="onReceipt" />
          </label>
          <img v-if="receiptPreview" class="thumb" :src="receiptPreview" alt="Selected receipt preview" />
        </div>
      </template>
    </main>
    <div v-if="ready && !submittedOrder" class="bar">
      <p v-if="submitError" class="error">{{ submitError }}</p>
      <p v-else-if="missingHint" class="hint">{{ missingHint }}</p>
      <button class="btn wa" type="button" :disabled="!canSubmit" @click="submit">{{ buttonLabel }}</button>
    </div>
  </div>
</template>
