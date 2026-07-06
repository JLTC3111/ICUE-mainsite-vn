import { createClient } from '@supabase/supabase-js'

let client = createUnavailableClient()
let configured = false
let initPromise = null

function isValidConfig(url, anonKey) {
  return Boolean(url && anonKey && !url.includes('YOUR-PROJECT-ref'))
}

function createUnavailableClient() {
  const message =
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Netlify, or commit news-app/public/supabase-config.json before building.'

  const queryResult = Promise.resolve({
    data: null,
    error: { message },
  })

  const chain = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return queryResult.then.bind(queryResult)
        if (prop === 'catch') return queryResult.catch.bind(queryResult)
        if (prop === 'finally') return queryResult.finally.bind(queryResult)
        return chain
      },
    },
  )

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      signInWithPassword: async () => ({ data: null, error: { message } }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: { message } }),
      updateUser: async () => ({ data: null, error: { message } }),
    },
    from: () => chain,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: null, error: { message } }),
      }),
    },
    rpc: async () => ({ data: null, error: { message } }),
  }
}

function createConfiguredClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

async function loadRuntimeConfig() {
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
  } catch (e) {
    console.warn('[supabase] Failed to load runtime config:', e)
  }

  return null
}

export function isSupabaseConfigured() {
  return configured
}

export async function initSupabase() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const config = await loadRuntimeConfig()
    if (!config) {
      client = createUnavailableClient()
      configured = false
      console.warn(
        '[supabase] Supabase is not configured. The newsroom cannot load articles until credentials are provided.',
      )
      return false
    }

    client = createConfiguredClient(config.url, config.anonKey)
    configured = true
    return true
  })()

  return initPromise
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const value = client[prop]
      if (typeof value === 'function') return value.bind(client)
      return value
    },
  },
)

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  media: 'article-media',
}

export const MEDIA_LIMITS = { images: 10, videos: 2 }
