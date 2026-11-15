<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  emoji: string
  color: string
  photoUrl: string | null
}>()

const broken = ref(false)
</script>

<template>
  <div class="pic" :style="{ background: color }">
    <img v-if="photoUrl && !broken" :src="photoUrl" alt="" @error="broken = true" />
    <span v-else>{{ emoji }}</span>
  </div>
</template>
