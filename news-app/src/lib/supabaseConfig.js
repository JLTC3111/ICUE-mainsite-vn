let configPromise = null

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
    const res = await fetch(`${base}supabase-config.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    if (isValidConfig(json?.url, json?.anonKey)) {
      return { url: json.url, anonKey: json.anonKey }
    }
  } catch (error) {
    console.warn('[supabase] Failed to load runtime config:', error)
  }

  return null
}

export function loadSupabaseConfig() {
  if (!configPromise) configPromise = resolveRuntimeConfig()
  return configPromise
}
