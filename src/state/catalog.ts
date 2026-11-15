import { ref } from 'vue'
import { getApi } from '../lib/api'
import { DEFAULT_SETTINGS } from '../lib/seed'
import type { Cake, Settings } from '../lib/types'

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const cakes = ref<Cake[]>([])
const ready = ref(false)
const catalogError = ref('')

export function useCatalog() {
  async function load(includeInactive: boolean): Promise<void> {
    try {
      const api = getApi()
      const [nextSettings, nextCakes] = await Promise.all([
        api.fetchSettings(),
        api.fetchCakes(includeInactive),
      ])
      settings.value = nextSettings
      cakes.value = [...nextCakes].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh'),
      )
      ready.value = true
      catalogError.value = ''
      if (typeof document !== 'undefined') document.title = nextSettings.shopName
    } catch (error) {
      console.error(error)
      if (!ready.value) catalogError.value = '加载失败'
    }
  }

  return { settings, cakes, ready, catalogError, load }
}
