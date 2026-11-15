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
    error.value = message.includes('invalid') || message.includes('credential') ? '邮箱或密码不对' : '登录失败'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="stage-fill">
    <template v-if="auth === 'out'">
      <form class="main login" @submit.prevent="submit">
        <div class="fields">
          <label for="login-email">邮箱</label>
          <input id="login-email" v-model="email" type="email" autocomplete="username" />
          <label for="login-password">密码</label>
          <input id="login-password" v-model="password" type="password" autocomplete="current-password" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn" type="submit" :disabled="pending || !email.trim() || !password">登录</button>
      </form>
    </template>
    <template v-else-if="auth === 'in'">
      <nav class="seg sub" aria-label="后台">
        <router-link to="/admin" exact-active-class="on">订单</router-link>
        <router-link to="/admin/settings" active-class="on">设置</router-link>
      </nav>
      <router-view />
    </template>
  </div>
</template>
