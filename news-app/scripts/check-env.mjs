import { loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = loadEnv('production', appDir, '')

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''

if (!url || !anonKey || url.includes('YOUR-PROJECT-ref')) {
  console.error(
    '\n[news-app] Missing Supabase credentials for production build.\n' +
      'Set these in Netlify → Site settings → Environment variables:\n' +
      '  - VITE_SUPABASE_URL (or SUPABASE_URL)\n' +
      '  - VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)\n',
  )
  process.exit(1)
}

console.log('[news-app] Supabase env vars present for build.')
