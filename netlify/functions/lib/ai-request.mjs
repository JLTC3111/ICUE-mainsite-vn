// Bound incoming payloads before decoding them or calling a paid provider.
export async function aiRequest(request, handler, env) {
  let body = ''
  if (request.method === 'POST' && request.body) {
    const reader = request.body.getReader()
    const chunks = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 512 * 1024) {
        await reader.cancel()
        return Response.json({ error: 'Request too large', code: 'payload_too_large' }, { status: 413 })
      }
      chunks.push(value)
    }
    const decoder = new TextDecoder()
    body = chunks.map(chunk => decoder.decode(chunk, { stream: true })).join('') + decoder.decode()
  }
  const result = await handler({ httpMethod: request.method, headers: Object.fromEntries(request.headers), body }, env)
  return new Response(result.body || null, { status: result.statusCode, headers: result.headers })
}
