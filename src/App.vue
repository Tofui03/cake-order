<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from './state/catalog'

const route = useRoute()
const { settings, load } = useCatalog()

watch(
  () => route.path,
  (path) => {
    if (path === '/') void load(false)
  },
  { immediate: true },
)
</script>

<template>
  <div class="app">
    <header>
      <h1>{{ settings.shopName }}</h1>
    </header>
    <nav class="seg" aria-label="页面">
      <router-link to="/" exact-active-class="on">点单</router-link>
      <router-link to="/admin" active-class="on">后台</router-link>
    </nav>
    <div class="stage">
      <router-view />
    </div>
  </div>
</template>
