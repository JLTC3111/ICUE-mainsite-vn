import { withDeadline } from '../../resilience/requests.js'

export function createHistoryApi({ endpoint = '/.netlify/functions/chat-history', request = globalThis.fetch } = {}) {
  return async (token, { method = 'GET', body, signal } = {}) => withDeadline(async requestSignal => {
    const response = await request(endpoint, {
      method, signal: requestSignal, credentials: 'omit', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) {
      const error = new Error(`sync_${response.status}`)
      error.status = response.status
      throw error
    }
    const result = await response.json()
    if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw new Error('invalid_response')
    return result
  }, { signal, timeoutMs: 12_000 })
}
