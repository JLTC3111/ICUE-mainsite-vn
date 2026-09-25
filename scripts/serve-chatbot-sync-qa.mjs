// Local-only QA gateway. Requires the documented disposable Postgres/PostgREST
// containers. Proxies the built site and runs the real Netlify handler.
import http from 'node:http'
import { createHmac } from 'node:crypto'
import handler from '../netlify/functions/chat-history.mjs'
const port = Number(process.env.ICUE_SYNC_QA_PORT || 3117)
const origin = `http://127.0.0.1:${port}`
const sign = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const claims = `${sign({ alg: 'HS256', typ: 'JWT' })}.${sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 86400 })}`
// This credential is valid only in the disposable QA container, never ICUE.
process.env.SUPABASE_URL = origin
process.env.SUPABASE_SERVICE_ROLE_KEY = `${claims}.${createHmac('sha256', 'icue-chat-local-qa-only-not-a-production-secret').update(claims).digest('base64url')}`
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const chunks = []
    for await (const chunk of incoming) chunks.push(chunk)
    const body = Buffer.concat(chunks)
    const init = { method: incoming.method, headers: incoming.headers, ...(body.length ? { body } : {}) }
    let response
    if (incoming.url.startsWith('/.netlify/functions/chat-history')) {
      response = await handler(new Request(origin + incoming.url, init))
    } else {
      const rest = incoming.url.startsWith('/rest/v1/')
      const target = rest ? `http://127.0.0.1:54340${incoming.url.slice('/rest/v1'.length)}` : `http://127.0.0.1:3116${incoming.url}`
      const headers = new Headers(incoming.headers)
      headers.delete('host'); headers.delete('connection'); headers.delete('accept-encoding')
      response = await fetch(target, { ...init, headers, redirect: 'manual' })
    }
    outgoing.writeHead(response.status, Object.fromEntries([...response.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key))))
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch {
    outgoing.writeHead(502); outgoing.end('Local QA gateway unavailable')
  }
})
server.listen(port, '127.0.0.1', () => process.stdout.write(`Local sync QA gateway: ${origin}\n`))
