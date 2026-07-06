import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fileEnv = loadEnv('production', appDir, '')
const env = { ...fileEnv, ...process.env }

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''

const outPath = path.join(appDir, 'public/supabase-config.json')

function isValid(urlValue, keyValue) {
  return Boolean(urlValue && keyValue && !urlValue.includes('YOUR-PROJECT-ref'))
}

let config = {
  url: isValid(url, anonKey) ? url : '',
  anonKey: isValid(url, anonKey) ? anonKey : '',
}

if (!isValid(config.url, config.anonKey) && fs.existsSync(outPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'))
    if (isValid(existing?.url, existing?.anonKey)) {
      config = existing
      console.log('[news-app] Keeping committed public/supabase-config.json.')
    }
  } catch (e) {
    // fall through and rewrite below
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`)

if (isValid(config.url, config.anonKey)) {
  console.log('[news-app] public/supabase-config.json is ready for runtime Supabase init.')
} else {
  console.warn(
    '[news-app] public/supabase-config.json is empty. Commit a populated file or set Supabase env vars before building.',
  )
}
