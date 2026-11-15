import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readSupabaseEnv } from '../src/lib/env'
import { SEED_CAKES } from '../src/lib/seed'

describe('readSupabaseEnv', () => {
  it('falls back to demo mode unless both values are set', () => {
    expect(readSupabaseEnv({})).toBeNull()
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' })).toBeNull()
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: '' })).toBeNull()
    expect(
      readSupabaseEnv({
        VITE_SUPABASE_URL: ' https://example.supabase.co ',
        VITE_SUPABASE_ANON_KEY: ' sb_publishable_x ',
      }),
    ).toEqual({
      url: 'https://example.supabase.co',
      key: 'sb_publishable_x',
    })
  })
})

describe('migration', () => {
  const sql = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations/20261115020000_init.sql'),
    'utf8',
  )

  it('seeds the shop and the example cakes', () => {
    expect(sql).toContain('妈妈的蛋糕')
    expect(sql).toContain('60123456789')
    for (const cake of SEED_CAKES) {
      expect(sql).toContain(cake.name)
      expect(sql).toContain(String(cake.price))
    }
  })

  it('lets anon insert orders but not read them', () => {
    expect(sql.toLowerCase()).toContain('enable row level security')
    expect(sql).toContain("status = '待确认'")
    expect(sql).toContain('grant insert on table public.orders to anon')
    expect(sql.toLowerCase()).not.toContain('grant select on table public.orders to anon')
    expect(sql).toContain('cake-photos')
    expect(sql).not.toContain('sb_secret_')
  })
})
