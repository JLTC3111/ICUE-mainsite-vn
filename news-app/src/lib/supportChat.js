import { supabase } from './supabase'
import { withDeadline } from '../../../shared/resilience/requests.js'

export async function supportChatRpc(name, args = {}, { signal } = {}) {
  return withDeadline(async requestSignal => {
    const { data, error } = await supabase.rpc(`support_chat_${name}`, args).abortSignal(requestSignal)
    if (error) throw error
    return data
  }, { signal, timeoutMs: 12_000 })
}

const keyFor = userId => `icue:support-drafts:v1:${userId}`
export function readSupportDrafts(userId) {
  try {
    const data = JSON.parse(sessionStorage.getItem(keyFor(userId)) || '{}')
    return Object.fromEntries(Object.entries(data).filter(([id, value]) =>
      /^[a-f0-9-]{36}$/i.test(id) && typeof value?.text === 'string' && value.text.length <= 4000
      && (!value.pending || (/^[a-f0-9-]{36}$/i.test(value.pending.id) && typeof value.pending.content === 'string' && value.pending.content.length <= 4000))))
  } catch { return {} }
}

export function saveSupportDrafts(userId, drafts) {
  try { sessionStorage.setItem(keyFor(userId), JSON.stringify(drafts)) } catch { /* The current page retains the draft. */ }
}
