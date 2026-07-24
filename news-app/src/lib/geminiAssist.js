import { supabase } from './supabase'

const ENDPOINT = '/newsroom/api/gemini-article'

export async function askGeminiAssist({
  mode = 'chat',
  messages = [],
  articleIds = [],
  language = '',
} = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    const err = new Error('Sign in required')
    err.code = 'unauthorized'
    throw err
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode, messages, articleIds, language }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(payload.error || 'Gemini request failed')
    err.code = payload.code || `http_${res.status}`
    err.status = res.status
    throw err
  }
  return payload
}
