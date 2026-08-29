/** Runtime env access for Netlify functions. */

function pick(name, aliases = []) {
  const keys = [name, ...aliases]
  for (const key of keys) {
    const value = process.env[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function loadRuntimeEnv() {
  const serviceKey = pick('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_SERVICE_KEY'])
  const geminiKey = pick('GEMINI_API_KEY', ['GOOGLE_GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'])
  const geminiModel = pick('GEMINI_MODEL')
  const cloudflareAccountId = pick('CLOUDFLARE_ACCOUNT_ID', ['CF_ACCOUNT_ID'])
  const cloudflareApiToken = pick('CLOUDFLARE_API_TOKEN', ['CF_API_TOKEN', 'CLOUDFLARE_AI_API_TOKEN'])
  const fluxModel = pick('CLOUDFLARE_FLUX_MODEL', ['CF_FLUX_MODEL'])
  const supabaseUrl = pick('SUPABASE_URL', ['VITE_SUPABASE_URL'])
  const anonKey = pick('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY'])

  return {
    ...process.env,
    ...(serviceKey ? { SUPABASE_SERVICE_ROLE_KEY: serviceKey } : {}),
    ...(geminiKey ? { GEMINI_API_KEY: geminiKey } : {}),
    ...(geminiModel ? { GEMINI_MODEL: geminiModel } : {}),
    ...(cloudflareAccountId ? { CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId } : {}),
    ...(cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: cloudflareApiToken } : {}),
    ...(fluxModel ? { CLOUDFLARE_FLUX_MODEL: fluxModel } : {}),
    ...(supabaseUrl ? { SUPABASE_URL: supabaseUrl, VITE_SUPABASE_URL: supabaseUrl } : {}),
    ...(anonKey ? { SUPABASE_ANON_KEY: anonKey, VITE_SUPABASE_ANON_KEY: anonKey } : {}),
  }
}

module.exports = { loadRuntimeEnv }
