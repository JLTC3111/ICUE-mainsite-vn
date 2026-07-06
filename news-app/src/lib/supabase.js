import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('YOUR-PROJECT-ref'),
)

function createUnavailableClient() {
  const message =
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY on Netlify) before building the newsroom app.'

  console.warn(`[supabase] ${message}`)

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

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createUnavailableClient()

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  media: 'article-media',
}

export const MEDIA_LIMITS = { images: 10, videos: 2 }
