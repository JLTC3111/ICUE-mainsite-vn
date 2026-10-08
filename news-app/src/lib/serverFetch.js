import { withDeadline } from '../../../shared/resilience/requests.js'

// Bound upstream headers and body reads. No automatic retries of writes.
export function serverFetch(input, init = {}) {
  return withDeadline(async signal => {
    const response = await fetch(input, { ...init, signal })
    const body = await response.arrayBuffer()
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    })
  }, { signal: init.signal, timeoutMs: 4_000 })
}
