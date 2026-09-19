export const REQUEST_TIMEOUT_MS = 20_000

/** A deadline also settles operations whose underlying promise ignores abort. */
export function withDeadline(operation, { signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  let rejectAbort
  const interrupted = new Promise((_, reject) => { rejectAbort = reject })
  const abort = (reason) => {
    controller.abort(reason)
    rejectAbort(reason)
  }
  const cancel = () => abort(signal.reason || new DOMException('Request cancelled', 'AbortError'))
  const timer = setTimeout(() => abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs)
  if (signal?.aborted) cancel()
  else signal?.addEventListener('abort', cancel, { once: true })
  const pending = Promise.resolve().then(() => {
    if (controller.signal.aborted) throw controller.signal.reason
    return operation(controller.signal)
  })
  return Promise.race([pending, interrupted]).finally(() => {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  })
}

/** No automatic retries: POSTs can succeed at the server before a disconnect. */
export function fetchWithDeadline(input, init = {}) {
  const method = String(init.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase()
  return withDeadline(async (signal) => {
    const response = await fetch(input, { ...init, signal })
    // Supabase consumes JSON/blob responses. Include body download in the
    // deadline instead of releasing it as soon as response headers arrive.
    const body = await response.arrayBuffer()
    return new Response(method === 'HEAD' || [204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    })
  }, { signal: init.signal ?? (typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined), timeoutMs: method === 'GET' || method === 'HEAD' ? REQUEST_TIMEOUT_MS : 90_000 })
}

/** Cache successful module/configuration loads, never a rejected attempt. */
export function createRetryableLoader(load, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  let pending = null
  return () => {
    if (!pending) {
      const attempt = withDeadline(load, { timeoutMs })
      pending = attempt
      attempt.catch(() => { if (pending === attempt) pending = null })
    }
    return pending
  }
}
