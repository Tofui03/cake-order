import { createDemoApi } from './demoStore'
import { readSupabaseEnv } from './env'
import { createSupabaseApi } from './supabaseApi'
import type { ShopApi } from './types'

let singleton: ShopApi | null = null

export function getApi(): ShopApi {
  if (!singleton) {
    const env = readSupabaseEnv(import.meta.env)
    singleton = env ? createSupabaseApi(env.url, env.key) : createDemoApi()
  }
  return singleton
}
