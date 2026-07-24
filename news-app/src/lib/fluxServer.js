import { resolveServerEnv, envString } from './serverEnv.js'

const CORS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEFAULT_MODEL = '@cf/black-forest-labs/flux-1-schnell'
const MAX_PROMPT = 2048

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
  }
}

function supabaseConfig(env) {
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    anonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '',
  }
}

export function cloudflareAccountId(env = {}) {
  return envString(env, ['CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID'])
}

export function cloudflareApiToken(env = {}) {
  return envString(env, ['CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN', 'CLOUDFLARE_AI_API_TOKEN'])
}

export function fluxModel(env = {}) {
  return envString(env, ['CLOUDFLARE_FLUX_MODEL', 'CF_FLUX_MODEL']) || DEFAULT_MODEL
}

async function verifyUser(accessToken, env) {
  const { url, anonKey } = supabaseConfig(env)
  if (!url || !anonKey) throw Object.assign(new Error('supabase_not_configured'), { status: 500 })
  if (!accessToken) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'unauthorized' })

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'unauthorized' })
  const user = await res.json()
  if (!user?.id) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'unauthorized' })
  return user
}

function normalizePrompt(raw) {
  return String(raw || '').trim().slice(0, MAX_PROMPT)
}

function normalizeSteps(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 4
  return Math.max(1, Math.min(8, Math.round(n)))
}

async function runFlux({ accountId, token, model, prompt, steps }) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, steps }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload?.success === false) {
    const msg = payload?.errors?.[0]?.message
      || payload?.error
      || `flux_http_${res.status}`
    const err = Object.assign(new Error(msg), {
      status: res.status === 429 ? 429 : res.status >= 500 ? 502 : 400,
      code: res.status === 429 ? 'rate_limited' : 'flux_failed',
      httpStatus: res.status,
    })
    throw err
  }

  const image = payload?.result?.image || payload?.image || ''
  if (!image) {
    throw Object.assign(new Error('empty image response'), {
      status: 502,
      code: 'flux_empty',
    })
  }

  return {
    image: String(image),
    model,
  }
}

export async function handleFluxImageRequest(event, rawEnv = process.env) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method not allowed', code: 'method_not_allowed' })
  }

  try {
    const env = resolveServerEnv(rawEnv)
    const accountId = cloudflareAccountId(env)
    const token = cloudflareApiToken(env)
    if (!accountId || !token) {
      return json(503, {
        error: 'Cloudflare Workers AI is not configured',
        code: 'flux_not_configured',
      })
    }

    const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : ''
    await verifyUser(accessToken, env)

    let body = {}
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: 'invalid json', code: 'invalid_json' })
    }

    const prompt = normalizePrompt(body.prompt)
    if (!prompt) {
      return json(400, { error: 'prompt required', code: 'prompt_required' })
    }

    const steps = normalizeSteps(body.steps)
    const model = fluxModel(env)
    const result = await runFlux({ accountId, token, model, prompt, steps })
    const dataUri = result.image.startsWith('data:')
      ? result.image
      : `data:image/jpeg;charset=utf-8;base64,${result.image}`

    return json(200, {
      prompt,
      steps,
      model: result.model,
      image: dataUri,
    })
  } catch (err) {
    const status = err?.status || 502
    const code = err?.code
      || (status === 401 ? 'unauthorized' : status === 429 ? 'rate_limited' : 'flux_failed')
    return json(status, {
      error: err?.message || 'image generation failed',
      code,
    })
  }
}
