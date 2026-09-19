import { createRetryableLoader, withDeadline } from '../../../shared/resilience/requests.js'

function isValidConfig(url, anonKey) {
  return Boolean(url && anonKey && !url.includes('YOUR-PROJECT-ref'))
}

async function resolveRuntimeConfig() {
  const buildUrl = import.meta.env.VITE_SUPABASE_URL
  const buildKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (isValidConfig(buildUrl, buildKey)) {
    return { url: buildUrl, anonKey: buildKey }
  }

  try {
    const base = import.meta.env.BASE_URL || '/'
    const json = await withDeadline(async (signal) => {
      const res = await fetch(`${base}supabase-config.json`, { cache: 'no-store', signal })
      if (!res.ok) throw new Error(`Configuration request failed (${res.status})`)
      return res.json()
    })
    if (isValidConfig(json?.url, json?.anonKey)) {
      return { url: json.url, anonKey: json.anonKey }
    }
  } catch (error) {
    console.warn('[supabase] Failed to load runtime config:', error)
  }

  return null
}

const loadConfig = createRetryableLoader(async () => {
  const config = await resolveRuntimeConfig()
  if (!config) throw new Error('Supabase configuration is unavailable')
  return config
})

export function loadSupabaseConfig() {
  return loadConfig().catch(() => null)
}
