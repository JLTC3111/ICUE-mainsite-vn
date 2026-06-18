import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey || url.includes('YOUR-PROJECT-ref')) {
  // Surfaced clearly in dev so the missing-credentials case is obvious.
  console.warn(
    '[supabase] Missing credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in news-app/.env',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  media: 'article-media',
}

export const MEDIA_LIMITS = { images: 10, videos: 2 }
