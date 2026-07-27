import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))

let cachedSupabaseFileConfig

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function loadSupabaseFileConfig() {
  if (cachedSupabaseFileConfig !== undefined) {
    return cachedSupabaseFileConfig
  }

  const candidates = [
    path.resolve(moduleDir, '../../public/supabase-config.json'),
    path.resolve(moduleDir, '../../../newsroom/supabase-config.json'),
    path.resolve(process.cwd(), 'newsroom/supabase-config.json'),
    path.resolve(process.cwd(), 'news-app/public/supabase-config.json'),
  ]

  for (const filePath of candidates) {
    const json = readJson(filePath)
    if (json?.url && json?.anonKey) {
      cachedSupabaseFileConfig = json
      return json
    }
  }

  cachedSupabaseFileConfig = null
  return null
}

/** Merge Netlify process.env with committed runtime config files. */
export function envString(env, keys) {
  for (const key of keys) {
    const value = env?.[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

export function supabaseServiceKey(env = {}) {
  return envString(env, [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
  ])
}

export function geminiApiKey(env = {}) {
  return envString(env, [
    'GEMINI_API_KEY',
    'GOOGLE_GEMINI_API_KEY',
    'GOOGLE_AI_API_KEY',
  ])
}

export function resolveServerEnv(rawEnv = process.env) {
  const env = { ...rawEnv }
  const fileConfig = loadSupabaseFileConfig()

  const serviceKey = supabaseServiceKey(env)
  if (serviceKey) {
    env.SUPABASE_SERVICE_ROLE_KEY = serviceKey
  }

  const geminiKey = geminiApiKey(env)
  if (geminiKey) {
    env.GEMINI_API_KEY = geminiKey
  }

  if (fileConfig?.url) {
    env.SUPABASE_URL ||= fileConfig.url
    env.VITE_SUPABASE_URL ||= fileConfig.url
  }

  if (fileConfig?.anonKey) {
    env.SUPABASE_ANON_KEY ||= fileConfig.anonKey
    env.VITE_SUPABASE_ANON_KEY ||= fileConfig.anonKey
  }

  return env
}
