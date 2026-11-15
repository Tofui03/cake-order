<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CakePic from '../components/CakePic.vue'
import { getApi } from '../lib/api'
import { formatRm } from '../lib/money'
import { photoProblem } from '../lib/photos'
import { placeholderColor } from '../lib/seed'
import type { Cake } from '../lib/types'
import { normalizeWhatsApp } from '../lib/whatsapp'
import { useCatalog } from '../state/catalog'

interface Draft {
  id: string
  name: string
  price: string
  photoUrl: string | null
  emoji: string
  color: string
  active: boolean
  sortOrder: number
  isNew: boolean
  file: File | null
  preview: string | null
}

const { cakes, settings, load } = useCatalog()
const shopName = ref('')
const whatsapp = ref('')
const problem = ref('')
const savingShop = ref(false)
const savingCake = ref(false)
const draft = ref<Draft | null>(null)
let previewUrl: string | null = null

onMounted(async () => {
  await load(true)
  shopName.value = settings.value.shopName
  whatsapp.value = settings.value.whatsapp
})

onUnmounted(() => {
  if (previewUrl) URL.revokeObjectURL(previewUrl)
})

const canSaveShop = computed(() => {
  const digits = normalizeWhatsApp(whatsapp.value)
  return shopName.value.trim().length > 0 && shopName.value.trim().length <= 40 && digits.length >= 8 && digits.length <= 20
})

function parsePrice(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const price = Number(trimmed)
  if (price <= 0 || price >= 100000) return null
  return price
}

const canSaveCake = computed(() => {
  if (!draft.value) return false
  const name = draft.value.name.trim()
  return name.length > 0 && name.length <= 40 && parsePrice(draft.value.price) !== null
})

function clearPreview(): void {
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  previewUrl = null
}

function closeDraft(): void {
  clearPreview()
  draft.value = null
  problem.value = ''
}

function edit(cake: Cake): void {
  closeDraft()
  draft.value = {
    id: cake.id,
    name: cake.name,
    price: formatRm(cake.price),
    photoUrl: cake.photoUrl,
    emoji: cake.emoji,
    color: cake.color,
    active: cake.active,
    sortOrder: cake.sortOrder,
    isNew: false,
    file: null,
    preview: null,
  }
}

function addCake(): void {
  closeDraft()
  const sortOrder = Math.max(0, ...cakes.value.map((cake) => cake.sortOrder)) + 1
  draft.value = {
    id: crypto.randomUUID(),
    name: '',
    price: '',
    photoUrl: null,
    emoji: '🎂',
    color: placeholderColor(cakes.value.length),
    active: true,
    sortOrder,
    isNew: true,
    file: null,
    preview: null,
  }
}

function onFile(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !draft.value) return
  const issue = photoProblem(file)
  if (issue) {
    problem.value = issue
    return
  }
  clearPreview()
  previewUrl = URL.createObjectURL(file)
  draft.value.file = file
  draft.value.preview = previewUrl
  problem.value = ''
}

async function saveShop(): Promise<void> {
  if (!canSaveShop.value || savingShop.value) return
  savingShop.value = true
  problem.value = ''
  const next = {
    shopName: shopName.value.trim(),
    whatsapp: normalizeWhatsApp(whatsapp.value),
  }
  try {
    await getApi().saveSettings(next)
    settings.value = next
    shopName.value = next.shopName
    whatsapp.value = next.whatsapp
    if (typeof document !== 'undefined') document.title = next.shopName
  } catch (error) {
    console.error(error)
    problem.value = '没有保存'
  } finally {
    savingShop.value = false
  }
}

async function toggle(cake: Cake): Promise<void> {
  const next = { ...cake, active: !cake.active }
  problem.value = ''
  try {
    await getApi().saveCake(next)
    cakes.value = cakes.value.map((entry) => (entry.id === cake.id ? next : entry))
    if (draft.value?.id === cake.id) draft.value.active = next.active
  } catch (error) {
    console.error(error)
    problem.value = '没有保存'
  }
}

async function saveCake(): Promise<void> {
  const current = draft.value
  if (!current || !canSaveCake.value || savingCake.value) return
  savingCake.value = true
  problem.value = ''
  try {
    let photoUrl = current.photoUrl
    if (current.file) {
      photoUrl = await getApi().uploadCakePhoto(current.id, current.file)
    }
    const price = parsePrice(current.price)
    if (price === null) return
    const cake: Cake = {
      id: current.id,
      name: current.name.trim(),
      price,
      photoUrl,
      emoji: current.emoji,
      color: current.color,
      active: current.active,
      sortOrder: current.sortOrder,
    }
    await getApi().saveCake(cake)
    closeDraft()
    await load(true)
  } catch (error) {
    console.error(error)
    problem.value = error instanceof Error && (error.message === '照片太大' || error.message === '请选图片')
      ? error.message
      : '没有保存'
  } finally {
    savingCake.value = false
  }
}

async function remove(cake: Cake): Promise<void> {
  if (!window.confirm(`删除「${cake.name}」？`)) return
  problem.value = ''
  try {
    await getApi().deleteCake(cake.id)
    if (draft.value?.id === cake.id) closeDraft()
    await load(true)
  } catch (error) {
    console.error(error)
    problem.value = '没有保存'
  }
}

async function logout(): Promise<void> {
  try {
    await getApi().signOut()
  } catch (error) {
    console.error(error)
    problem.value = '没有保存'
  }
}
</script>

<template>
  <main class="main">
    <div class="fields">
      <label for="shop-name">店名</label>
      <input id="shop-name" v-model="shopName" maxlength="40" autocomplete="organization" />
      <label for="shop-whatsapp">WhatsApp</label>
      <input id="shop-whatsapp" v-model="whatsapp" maxlength="20" inputmode="tel" autocomplete="tel" />
    </div>
    <button class="btn shop-save" type="button" :disabled="!canSaveShop || savingShop" @click="saveShop">保存</button>

    <h2 class="section">蛋糕</h2>
    <p v-if="problem" class="error">{{ problem }}</p>

    <div v-for="cake in cakes" :key="cake.id" class="cake-edit">
      <div class="item">
        <CakePic :emoji="cake.emoji" :color="cake.color" :photo-url="cake.photoUrl" />
        <div class="info">
          <div class="name">{{ cake.name }}</div>
          <div class="price">RM {{ formatRm(cake.price) }}</div>
        </div>
        <button
          class="switch"
          :class="{ on: cake.active }"
          type="button"
          role="switch"
          :aria-checked="cake.active"
          :aria-label="cake.active ? '在售' : '已下架'"
          @click="toggle(cake)"
        >
          <i></i>
        </button>
      </div>
      <button v-if="draft?.id !== cake.id" class="text-btn" type="button" @click="edit(cake)">编辑</button>
      <form v-else class="editor" @submit.prevent="saveCake">
        <div class="fields">
          <label :for="`cake-name-${cake.id}`">名字</label>
          <input :id="`cake-name-${cake.id}`" v-model="draft.name" maxlength="40" />
          <label :for="`cake-price-${cake.id}`">价格</label>
          <input :id="`cake-price-${cake.id}`" v-model="draft.price" inputmode="decimal" />
          <label>照片</label>
          <div class="photo-row">
            <CakePic :emoji="draft.emoji" :color="draft.color" :photo-url="draft.preview || draft.photoUrl" />
            <label class="file">
              照片
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onFile" />
            </label>
          </div>
        </div>
        <button class="btn" type="submit" :disabled="!canSaveCake || savingCake">保存</button>
        <button class="btn ghost" type="button" @click="remove(cake)">删除</button>
        <button class="text-btn" type="button" @click="closeDraft">关闭</button>
      </form>
    </div>

    <form v-if="draft?.isNew" class="editor new-cake" @submit.prevent="saveCake">
      <div class="fields">
        <label for="new-cake-name">名字</label>
        <input id="new-cake-name" v-model="draft.name" maxlength="40" />
        <label for="new-cake-price">价格</label>
        <input id="new-cake-price" v-model="draft.price" inputmode="decimal" />
        <label>照片</label>
        <div class="photo-row">
          <CakePic :emoji="draft.emoji" :color="draft.color" :photo-url="draft.preview || draft.photoUrl" />
          <label class="file">
            照片
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onFile" />
          </label>
        </div>
      </div>
      <button class="btn" type="submit" :disabled="!canSaveCake || savingCake">保存</button>
      <button class="text-btn" type="button" @click="closeDraft">关闭</button>
    </form>

    <button v-else class="btn ghost add" type="button" @click="addCake">添加蛋糕</button>
    <button class="btn ghost logout" type="button" @click="logout">退出</button>
  </main>
</template>
