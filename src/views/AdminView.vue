<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { getApi } from '../lib/api'

const auth = ref<'checking' | 'in' | 'out'>('checking')
const email = ref('')
const password = ref('')
const pending = ref(false)
const error = ref('')
let stop = () => {}

onMounted(async () => {
  const api = getApi()
  try {
    auth.value = (await api.signedIn()) ? 'in' : 'out'
  } catch (err) {
    console.error(err)
    auth.value = 'out'
  }
  stop = api.onAuth((signedIn) => {
    auth.value = signedIn ? 'in' : 'out'
  })
})

onUnmounted(() => stop())

async function submit(): Promise<void> {
  if (pending.value || !email.value.trim() || !password.value) return
  pending.value = true
  error.value = ''
  try {
    await getApi().signIn(email.value, password.value)
    password.value = ''
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message.toLowerCase() : ''
    error.value = message.includes('invalid') || message.includes('credential') ? 'Invalid email or password' : 'Sign in failed'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="stage-fill">
    <p v-if="auth === 'checking'" class="empty">Loading…</p>
    <template v-else-if="auth === 'out'">
      <form class="main login" @submit.prevent="submit">
        <h2 class="section login-title">Admin Login</h2>
        <div class="fields">
          <label for="login-email">Email</label>
          <input id="login-email" v-model="email" type="email" autocomplete="username" />
          <label for="login-password">Password</label>
          <input id="login-password" v-model="password" type="password" autocomplete="current-password" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn" type="submit" :disabled="pending || !email.trim() || !password">Sign In</button>
      </form>
    </template>
    <template v-else-if="auth === 'in'">
      <nav class="seg sub" aria-label="Admin">
        <router-link to="/admin" exact-active-class="on">Orders</router-link>
        <router-link to="/admin/settings" active-class="on">Settings</router-link>
      </nav>
      <router-view />
    </template>
  </div>
</template>
