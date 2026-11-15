export interface SupabaseEnv {
  url: string
  key: string
}

function present(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return ''
  return trimmed
}

/** Both values must be set. Empty means demo mode. */
export function readSupabaseEnv(source: {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}): SupabaseEnv | null {
  const url = present(source.VITE_SUPABASE_URL)
  const key = present(source.VITE_SUPABASE_ANON_KEY)
  if (!url || !key) return null
  return { url, key }
}
