import { loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fileEnv = loadEnv('production', appDir, '')
const env = { ...fileEnv, ...process.env }

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''

if (!url || !anonKey || url.includes('YOUR-PROJECT-ref')) {
  console.warn(
    '\n[news-app] Warning: Supabase credentials are not set for this build.\n' +
      'The newsroom will deploy in read-only/offline mode until these are added in\n' +
      'Netlify → Site settings → Environment variables:\n' +
      '  - VITE_SUPABASE_URL (or SUPABASE_URL)\n' +
      '  - VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)\n',
  )
} else {
  console.log('[news-app] Supabase env vars present for build.')
}
