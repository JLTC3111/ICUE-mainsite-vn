import test from 'node:test'
import assert from 'node:assert/strict'
import { createNewsletterHandler, deliverNewsletter, newsletterEmail } from '../../news-app/supabase/functions/newsletter/handler.mjs'

const urls = { siteUrl: 'https://vi.icue.vn', functionUrl: 'https://project.example.invalid/functions/v1/newsletter' }
const token = 'a'.repeat(64)
const dispatchKey = 'b'.repeat(64)
const subscriberId = '00000000-0000-4000-8000-000000009001'
const confirmation = { id: '00000000-0000-4000-8000-000000009002', claim_token: '00000000-0000-4000-8000-000000009003', kind: 'confirmation', email: 'reader@example.com', locale: 'en', token }
const article = { ...confirmation, id: '00000000-0000-4000-8000-000000009004', kind: 'article', article_title: 'A new article', article_slug: 'a-new-article' }

function fixture({ rpc = async () => undefined, send = async () => {} } = {}) {
  const calls = []
  const emails = []
  const admin = { rpc: async (name, args) => {
    calls.push({ name, args })
    const override = await rpc(name, args)
    if (override !== undefined) return override
    if (name === 'newsletter_subscribe') return { data: { id: subscriberId, queued: false } }
    if (name === 'newsletter_claim') return { data: [] }
    if (name === 'newsletter_dispatch_key_valid') return { data: args.p_key === dispatchKey }
    return { data: true }
  } }
  const sendEmail = async message => { emails.push(message); await send(message) }
  return { calls, emails, admin, sendEmail, handler: createNewsletterHandler({ admin, sendEmail, ...urls, ipSalt: 'fixture-private-salt' }) }
}

const request = (body, { action, method = 'POST', headers = {}, query = '' } = {}) => new Request(`${urls.functionUrl}${action ? `?action=${action}${query}` : ''}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
})

test('subscriptions validate bounded JSON and a single mailbox before accessing the queue', async () => {
  const f = fixture()
  for (const body of ['{', 'null', '[]', 'true', '"email@example.com"', 'x'.repeat(4097)]) {
    const response = await f.handler(request(body))
    assert.equal(response.status, 400, body.slice(0, 20))
    assert.deepEqual(await response.json(), { code: 'invalid_request' })
  }
  for (const email of ['', 'no-domain', 'a@b', 'a@@example.com', 'a b@example.com', '<a@example.com>', 'a@example.com\r\nBcc: other@example.com', 'alice,bob@example.com', 'alice;bob@example.com', 'alice:bob@example.com', '"alice"@example.com', 'alice\\bob@example.com', '.alice@example.com', 'alice.@example.com', 'alice..bob@example.com', `${'x'.repeat(65)}@example.com`, `${'x'.repeat(244)}@example.com`]) {
    const response = await f.handler(request({ email }))
    assert.equal(response.status, 422, `must reject ${JSON.stringify(email)}`)
    assert.deepEqual(await response.json(), { code: 'invalid_email' })
  }
  assert.equal(f.calls.length, 0)
  assert.equal(f.emails.length, 0)
})

test('streamed body limits cancel oversized input without Content-Length', async () => {
  const f = fixture()
  let cancelled = false
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(3000)); controller.enqueue(new Uint8Array(3000)) },
    cancel() { cancelled = true },
  })
  const response = await f.handler(new Request(urls.functionUrl, { method: 'POST', body, duplex: 'half' }))
  assert.equal(response.status, 400)
  assert.equal(cancelled, true)
  assert.equal(f.calls.length, 0)
})

test('declared oversized requests are rejected before reading the stream', async () => {
  const f = fixture()
  const response = await f.handler(request({ email: 'reader@example.com' }, { headers: { 'Content-Length': '4097' } }))
  assert.equal(response.status, 400)
  assert.equal(f.calls.length, 0)
})

test('honeypot submissions return the ordinary acknowledgement without storing or emailing', async () => {
  const f = fixture()
  const response = await f.handler(request({ website: 'spam.example', email: 'reader@example.com' }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(f.calls.length, 0)
  assert.equal(f.emails.length, 0)
})

test('CORS allows ICUE and local development origins and rejects lookalike domains before writes', async () => {
  const f = fixture()
  for (const origin of ['https://icue.vn', 'https://vi.icue.vn', 'https://en.icue.vn', 'http://localhost:5173', 'http://127.0.0.1:5173', new URL(urls.functionUrl).origin]) {
    const response = await f.handler(request(undefined, { method: 'OPTIONS', headers: { Origin: origin } }))
    assert.equal(response.status, 204, origin)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin)
    assert.equal(response.headers.get('Vary'), 'Origin')
  }
  for (const origin of ['https://icue.vn.attacker.example', 'https://evilicue.vn', 'https://attacker.example', 'http://vi.icue.vn', 'null']) {
    const response = await f.handler(request({ email: 'reader@example.com' }, { headers: { Origin: origin } }))
    assert.equal(response.status, 403, origin)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null)
  }
  assert.equal(f.calls.length, 0)
})

test('subscriptions normalize the email and language, hash the IP, and never return private capabilities', async () => {
  const f = fixture()
  const response = await f.handler(request({ email: ' Reader+Updates@Example.COM ', locale: 'vi', token: 'visitor-chosen-token' }, { headers: { 'cf-connecting-ip': '203.0.113.10' } }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(f.calls[0].name, 'newsletter_subscribe')
  const args = f.calls[0].args
  assert.equal(args.p_email, 'reader+updates@example.com')
  assert.equal(args.p_locale, 'vi')
  assert.match(args.p_ip_hash, /^[a-f0-9]{64}$/)
  assert.notEqual(args.p_ip_hash, '203.0.113.10')
  assert.deepEqual(Object.keys(args).sort(), ['p_email', 'p_ip_hash', 'p_locale'])
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer')
  await f.handler(request({ email: 'reader2@example.com', locale: 'invalid' }, { headers: { 'x-forwarded-for': '203.0.113.10, 192.0.2.1' } }))
  assert.equal(f.calls[1].args.p_locale, 'en')
  assert.equal(f.calls[1].args.p_ip_hash, args.p_ip_hash, 'the first forwarded address identifies the same visitor')
})

test('database rate limiting and outages return actionable errors without private details', async () => {
  const limited = fixture({ rpc: async () => ({ error: { message: 'NEWSLETTER_RATE_LIMIT private detail' } }) })
  const response = await limited.handler(request({ email: 'reader@example.com' }))
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('Retry-After'), '3600')
  assert.deepEqual(await response.json(), { code: 'rate_limited' })
  const unavailable = fixture({ rpc: async () => { throw new Error('private DB credentials') } })
  const failure = await unavailable.handler(request({ email: 'reader@example.com' }))
  assert.equal(failure.status, 503)
  assert.deepEqual(await failure.json(), { code: 'unavailable' })
})

test('GET confirmation and unsubscribe links redirect to canonical website review pages without consent mutations', async () => {
  const f = fixture()
  for (const action of ['confirm', 'unsubscribe']) {
    const response = await f.handler(request(undefined, { action, method: 'GET', query: `&token=${token}&locale=en&redirect=https%3A%2F%2Fattacker.example` }))
    assert.equal(response.status, 303)
    const redirect = new URL(response.headers.get('Location'))
    assert.equal(redirect.origin, urls.siteUrl)
    assert.equal(redirect.pathname, '/newsroom/newsletter')
    assert.deepEqual(Object.fromEntries(redirect.searchParams), { action, token, locale: 'en' })
    assert.doesNotMatch(await response.text(), /<html|<form/)
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer')
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  }
  const spoofedHost = await f.handler(new Request(`https://untrusted.example/functions/v1/newsletter?action=confirm&token=${token}&locale=%22%3E%3Cscript%3E`))
  const safeLocation = new URL(spoofedHost.headers.get('Location'))
  assert.equal(safeLocation.origin, urls.siteUrl, 'the request host cannot control the destination')
  assert.equal(safeLocation.searchParams.get('locale'), 'en', 'unrecognized encoded values are normalized')
  assert.doesNotMatch(safeLocation.href, /untrusted|script|%22|%3E/)
  assert.equal(f.calls.length, 0)
  assert.equal(f.emails.length, 0)
})

test('confirmation and one-click unsubscribe POSTs invoke only the token-authorized RPC', async () => {
  for (const action of ['confirm', 'unsubscribe']) {
    const f = fixture()
    const response = await f.handler(request(action === 'unsubscribe' ? 'List-Unsubscribe=One-Click' : '', { action, query: `&token=${token}` }))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
    assert.deepEqual(f.calls, [{ name: `newsletter_${action}`, args: { p_token: token } }])
    assert.equal(f.emails.length, 0)
    const invalid = fixture({ rpc: async () => ({ data: false }) })
    const invalidResponse = await invalid.handler(request('', { action, query: `&token=${token}` }))
    assert.equal(invalidResponse.status, 400)
    assert.deepEqual(await invalidResponse.json(), { code: 'invalid_token' })
    const failure = fixture({ rpc: async () => ({ error: { message: 'private database failure' } }) })
    const failedResponse = await failure.handler(request('', { action, query: `&token=${token}` }))
    assert.equal(failedResponse.status, 503)
    assert.deepEqual(await failedResponse.json(), { code: 'unavailable' })
  }
})

test('invalid capability links never reach the database or reflect injected HTML', async () => {
  const f = fixture()
  for (const action of ['confirm', 'unsubscribe']) {
    for (const bad of ['', 'a'.repeat(63), 'A'.repeat(64), '<script>alert(1)</script>']) {
      const response = await f.handler(request(undefined, { action, method: 'GET', query: `&token=${encodeURIComponent(bad)}` }))
      assert.equal(response.status, 400)
      assert.equal(response.headers.get('Location'), null)
      assert.deepEqual(await response.json(), { code: 'invalid_token' })
    }
  }
  assert.equal(f.calls.length, 0)
})

test('dispatch rejects missing, malformed and incorrect keys before claiming any emails', async () => {
  const f = fixture()
  for (const key of ['', 'invalid', 'c'.repeat(64)]) {
    const response = await f.handler(request(undefined, { action: 'dispatch', headers: { 'x-newsletter-key': key } }))
    assert.equal(response.status, 403)
  }
  assert.deepEqual(f.calls, [{ name: 'newsletter_dispatch_key_valid', args: { p_key: 'c'.repeat(64) } }])
  assert.equal(f.emails.length, 0)
  const unavailable = fixture({ rpc: async () => ({ error: { message: 'Vault unavailable' } }) })
  assert.equal((await unavailable.handler(request(undefined, { action: 'dispatch', headers: { 'x-newsletter-key': dispatchKey } }))).status, 403)
  assert.ok(unavailable.calls.every(call => call.name !== 'newsletter_claim'))
})

test('authenticated scheduler dispatch uses the private queue and acknowledges its lease', async () => {
  const f = fixture({ rpc: async name => name === 'newsletter_claim' ? { data: [article] } : undefined })
  const response = await f.handler(request(undefined, { action: 'dispatch', headers: { 'x-newsletter-key': dispatchKey } }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { sent: 1 })
  assert.deepEqual(f.calls.map(call => call.name), ['newsletter_dispatch_key_valid', 'newsletter_claim', 'newsletter_finish'])
  assert.deepEqual(f.calls[1].args, { p_limit: 5, p_subscriber_id: null })
  assert.deepEqual(f.calls[2].args, { p_id: article.id, p_claim_token: article.claim_token, p_error: null })
  assert.equal(f.emails.length, 1)
})

test('SMTP diagnostics require the private dispatch key and never claim or send mail', async () => {
  const f = fixture()
  let verified = 0
  const handler = createNewsletterHandler({ admin: f.admin, sendEmail: f.sendEmail, ...urls, ipSalt: 'salt', verifyEmail: async () => { verified++ } })
  const endpoint = `${urls.functionUrl}?action=dispatch&check=smtp`
  assert.equal((await handler(new Request(endpoint, { method: 'POST' }))).status, 403)
  assert.equal(verified, 0)
  const response = await handler(new Request(endpoint, { method: 'POST', headers: { 'x-newsletter-key': dispatchKey } }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(verified, 1)
  assert.ok(f.calls.every(call => call.name === 'newsletter_dispatch_key_valid'))
  assert.equal(f.emails.length, 0)
})

test('a subscription durably queues its confirmation before SMTP; SMTP failure remains retryable', async () => {
  let smtpFails = true
  const f = fixture({
    rpc: async name => name === 'newsletter_subscribe' ? { data: { id: subscriberId, queued: true } }
      : name === 'newsletter_claim' ? { data: [confirmation] } : undefined,
    send: async () => { if (smtpFails) throw new Error('private SMTP password') },
  })
  const response = await f.handler(request({ email: 'reader@example.com', locale: 'en' }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(f.calls.map(call => call.name), ['newsletter_subscribe', 'newsletter_claim', 'newsletter_finish'])
  assert.deepEqual(f.calls[1].args, { p_limit: 1, p_subscriber_id: subscriberId })
  assert.equal(f.calls[2].args.p_error, 'smtp_delivery_failed')
  smtpFails = false
  assert.equal(await deliverNewsletter(f.admin, f.sendEmail, urls), 1)
  assert.equal(f.calls.at(-1).args.p_error, null)
  assert.equal(f.emails[0].messageId, f.emails[1].messageId, 'SMTP retries preserve the delivery message ID')
})

test('queue failures do not claim successful delivery or leak sensitive exception text', async () => {
  const f = fixture({ rpc: async name => name === 'newsletter_claim' ? { error: { message: 'private SQL details' } } : undefined })
  await assert.rejects(deliverNewsletter(f.admin, f.sendEmail, urls), /queue_unavailable/)
  assert.equal(f.emails.length, 0)
  const ack = fixture({ rpc: async name => name === 'newsletter_claim' ? { data: [article] } : name === 'newsletter_finish' ? { error: { message: 'private SQL details' } } : undefined })
  await assert.rejects(deliverNewsletter(ack.admin, ack.sendEmail, urls), /acknowledgement_unavailable/)
  const stale = fixture({ rpc: async name => name === 'newsletter_claim' ? { data: [article] } : { data: false } })
  assert.equal(await deliverNewsletter(stale.admin, stale.sendEmail, urls), 0, 'an expired or cancelled lease is not counted as sent')
})

test('article email escapes authored text and URL segments and includes one-click unsubscribe', () => {
  const message = newsletterEmail({ ...article, article_title: '<img src=x onerror=alert(1)> & "hello"\r\nBcc: victim@example.com', article_slug: '../../?next=" onclick="alert(1)#fragment' }, urls)
  assert.doesNotMatch(message.html, /<img|onclick="alert|onerror=alert\(1\)>/)
  assert.match(message.html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;hello&quot;/)
  assert.doesNotMatch(message.subject, /[\r\n]/)
  assert.ok(message.text.includes(`${urls.siteUrl}/newsroom/article/${encodeURIComponent('../../?next=" onclick="alert(1)#fragment')}`))
  const link = new URL(message.headers['List-Unsubscribe'].slice(1, -1))
  assert.equal(link.origin, new URL(urls.functionUrl).origin)
  assert.equal(link.searchParams.get('action'), 'unsubscribe')
  assert.equal(link.searchParams.get('token'), token)
  assert.equal(message.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  const humanLink = new URL(message.text.split('\n').find(line => line.startsWith('Unsubscribe: ')).slice('Unsubscribe: '.length))
  assert.equal(humanLink.origin, urls.siteUrl)
  assert.equal(humanLink.pathname, '/newsroom/newsletter')
  assert.equal(humanLink.searchParams.get('action'), 'unsubscribe')
  assert.equal(humanLink.searchParams.get('token'), token)
  assert.match(message.html, /&amp;token=/)
  assert.deepEqual(message.to, { address: article.email }, 'an address object prevents Nodemailer address-list parsing')
})

test('confirmation email links use the canonical website consent page and omit unsubscribe headers', () => {
  const message = newsletterEmail({ ...confirmation, locale: 'unknown' }, urls)
  assert.match(message.text, /Confirm subscription:/)
  const link = new URL(message.text.split('\n').find(line => line.startsWith('Confirm subscription: ')).slice('Confirm subscription: '.length))
  assert.equal(link.origin, urls.siteUrl)
  assert.equal(link.pathname, '/newsroom/newsletter')
  assert.equal(link.searchParams.get('action'), 'confirm')
  assert.equal(link.searchParams.get('token'), token)
  assert.equal(link.searchParams.get('locale'), 'en')
  assert.equal(message.headers, undefined)
})

test('all supported locales receive localized confirmation emails and keep their consent-page language', () => {
  const subjects = new Set()
  for (const locale of ['vi', 'en', 'fr', 'de', 'ja', 'ko']) {
    const message = newsletterEmail({ ...confirmation, locale }, urls)
    subjects.add(message.subject)
    const href = message.html.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&')
    const link = new URL(href)
    assert.equal(link.origin, urls.siteUrl)
    assert.equal(link.pathname, '/newsroom/newsletter')
    assert.equal(link.searchParams.get('locale'), locale)
    assert.equal(link.searchParams.get('action'), 'confirm')
    assert.equal(link.searchParams.get('token'), token)
  }
  assert.equal(subjects.size, 6, 'each supported locale has translated confirmation copy')
})
