import { createClient } from '@supabase/supabase-js'
import { loadSupabaseConfig } from './supabaseConfig'

let client = createUnavailableClient()
let configured = false
let initPromise = null

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

export function isSupabaseConfigured() {
  return configured
}

export async function initSupabase() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const config = await loadSupabaseConfig()
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
