import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRoomFilesHandler, inspectMedia, readBounded, IMAGE_LIMIT } from '../../news-app/supabase/functions/room-chat-files/handler.mjs'

const room = '00000000-0000-4000-8000-000000009101', id = '00000000-0000-4000-8000-000000009102'
const path = `${room}/${id}.png`
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEX/AAAZ4gk3AAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC', 'base64'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const meta = { id, path, name: 'test.png', mime: 'image/png', size: png.length, sha256: hash(png) }
function fixture({ denied = false, duplicate = false, finalizeError = null, removeFail = false, sanitizeError = false, sanitizeVideo = undefined } = {}) {
 const calls = [], objects = new Map(duplicate ? [[path, new Blob([png])]] : [])
 const user = { rpc: async (name, args) => {
  calls.push({ name, args })
  if (denied) return { error: { code: '42501' } }
  return { data: name.endsWith('file_authorize') ? { room_id: room } : name.endsWith('file_reserve') ? { ...meta, status: 'reserved' } : meta }
 } }
 const admin = { rpc: async (name, args) => {
  calls.push({ name, args })
  if (name.endsWith('file_ready')) return finalizeError ? { error: { code: finalizeError } } : { data: meta }
  if (name.endsWith('cleanup_key_valid')) return { data: args.p_key === 'a'.repeat(64) }
  if (name.endsWith('cleanup_batch')) return { data: { paths: [path] } }
  return { data: null }
 }, storage: { from: bucket => {
  assert.equal(bucket, 'room-chat')
  return {
   upload: async (key, bytes, options) => {
    calls.push({ name: 'upload', key, options })
    if (objects.has(key)) return { error: { statusCode: 409 } }
    objects.set(key, new Blob([bytes])); return { data: { path: key } }
   },
   download: async key => { calls.push({ name: 'download', key }); return objects.has(key) ? { data: objects.get(key) } : { error: { statusCode: 404 } } },
   remove: async paths => { calls.push({ name: 'remove', paths }); if (removeFail) return { error: { statusCode: 503 } }; paths.forEach(key => objects.delete(key)); return { data: paths } },
  }
 } } }
 const handler = createRoomFilesHandler({ userClient: () => user, admin, sanitizeImage: async (bytes, mime) => {
  calls.push({ name: 'sanitize', bytes, mime })
  if (sanitizeError) throw new Error('decoder detected corruption')
  return { bytes: png, mime: 'image/png' }
 }, sanitizeVideo })
 return { calls, objects, handler }
}
function upload(bytes = png, name = 'test.png', type = 'image/png', signed = true) {
 const form = new FormData()
 form.append('file', new File([bytes], name, { type })); form.append('room_id', room); form.append('client_id', id)
 return new Request('https://example.invalid', { method: 'POST', headers: signed ? { Authorization: 'Bearer authenticated-account' } : {}, body: form })
}
const action = (name = 'download', extra = {}, signed = true) => new Request('https://example.invalid', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(signed ? { Authorization: 'Bearer authenticated-account' } : {}), ...extra }, body: JSON.stringify({ action: name, room_id: room, file_id: id }) })

test('files require backend room authorization before decoding; storage contains only sanitized bytes', async () => {
 const f = fixture(), result = await f.handler(upload())
 assert.equal(result.status, 200)
 assert.deepEqual(f.calls.slice(0, 3).map(call => call.name), ['room_chat_file_authorize', 'sanitize', 'room_chat_file_reserve'])
 assert.equal(f.calls[2].args.p_sha256, hash(png))
 assert.equal(f.calls.find(call => call.name === 'upload').options.upsert, false)
 assert.deepEqual(await result.json(), meta)
 const denied = fixture({ denied: true })
 assert.equal((await denied.handler(upload())).status, 403)
 assert.equal((await denied.handler(action())).status, 403)
 assert.ok(!denied.calls.some(call => ['sanitize', 'upload', 'download'].includes(call.name)))
 assert.equal((await f.handler(upload(png, 'test.png', 'image/png', false))).status, 401)
})

test('unsupported, spoofed, incomplete and decoder-rejected media never create a reservation or object', async () => {
 const f = fixture()
 for (const request of [upload(png, 'forged.jpg', 'image/jpeg'), upload(new TextEncoder().encode('<svg onload="evil()"/>'), 'test.svg', 'image/svg+xml'), upload(png.subarray(0, 16)), upload(png, 'test.png', 'video/mp4')]) {
  assert.ok([400, 413, 415].includes((await f.handler(request)).status))
 }
 const failedDecode = fixture({ sanitizeError: true })
 assert.equal((await failedDecode.handler(upload())).status, 400)
 assert.ok(!failedDecode.calls.some(call => call.name === 'room_chat_file_reserve'))
 assert.equal(f.objects.size, 0)
 assert.throws(() => inspectMedia(new Uint8Array(IMAGE_LIMIT + 1).fill(0), 'huge.png', 'image/png'))
 const brokenWebP = Uint8Array.from(Buffer.from('UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoCAAIAAgA0JaACdLoB+AADsAD+8MQL/yC5YXXI1/8gP+QH/ID/+PIAAAA=', 'base64')).subarray(0, 30)
 assert.throws(() => inspectMedia(brokenWebP, 'test.webp', 'image/webp'), /incomplete|corrupt/)
})

test('MP4 fails closed when a full server video sanitizer is unavailable', async () => {
 const mp4 = new Uint8Array(24); mp4.set(new TextEncoder().encode('ftypisom'), 4)
 const f = fixture(), response = await f.handler(upload(mp4, 'video.mp4', 'video/mp4'))
 assert.equal(response.status, 415)
 assert.match((await response.json()).error, /sanitization is unavailable/)
 assert.ok(!f.calls.some(call => call.name === 'room_chat_file_reserve'))
 const invalidVideo = fixture({ sanitizeVideo: async () => { throw new Error('bad frames') } })
 assert.equal((await invalidVideo.handler(upload(mp4, 'video.mp4', 'video/mp4'))).status, 400)
 assert.equal(invalidVideo.objects.size, 0)
})

test('downloads verify hash and length and return no-store attachments only after current membership checks', async () => {
 const f = fixture({ duplicate: true }), response = await f.handler(action())
 assert.equal(response.status, 200)
 assert.equal(response.headers.get('Cache-Control'), 'no-store')
 assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
 assert.match(response.headers.get('Content-Disposition'), /^attachment;/)
 assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox")
 assert.equal(f.calls[0].name, 'room_chat_file_download')
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()), png)
 f.objects.set(path, new Blob(['corrupt']))
 assert.equal((await f.handler(action())).status, 410)
 assert.equal(f.objects.size, 0)
 const rejectIndex = f.calls.findIndex(call => call.name === 'room_chat_file_reject')
 assert.ok(rejectIndex > 0 && rejectIndex < f.calls.findIndex(call => call.name === 'remove'))
 assert.equal((await f.handler(action('download', {}, false))).status, 401)
})

test('retries verify existing object bytes; uncertain finalization retains files; definitive revocation queues removal', async () => {
 const retry = fixture({ duplicate: true })
 assert.equal((await retry.handler(upload())).status, 200)
 retry.objects.set(path, new Blob(['different']))
 assert.equal((await retry.handler(upload())).status, 409)
 assert.equal(retry.objects.size, 0)
 const uncertain = fixture({ finalizeError: 'FETCH_ERROR' })
 assert.equal((await uncertain.handler(upload())).status, 503)
 assert.equal(uncertain.objects.size, 1)
 assert.ok(!uncertain.calls.some(call => call.name === 'room_chat_file_reject'))
 const expired = fixture({ finalizeError: '42501', removeFail: true })
 assert.equal((await expired.handler(upload())).status, 403)
 assert.ok(expired.calls.some(call => call.name === 'room_chat_file_reject'))
 assert.equal(expired.objects.size, 1, 'failed physical deletion remains in SQL cleanup queue')
})

test('discard stays ownership checked; scheduled cleanup retains queue entries until Storage deletion succeeds', async () => {
 const f = fixture({ duplicate: true })
 assert.equal((await f.handler(action('discard'))).status, 200)
 assert.equal(f.calls[0].name, 'room_chat_file_discard')
 const denied = fixture({ denied: true })
 assert.equal((await denied.handler(action('discard'))).status, 403)
 assert.equal((await f.handler(action('cleanup', { 'x-cleanup-key': 'b'.repeat(64) }, false))).status, 403)
 const fail = fixture({ removeFail: true })
 assert.equal((await fail.handler(action('cleanup', { 'x-cleanup-key': 'a'.repeat(64) }, false))).status, 503)
 assert.ok(!fail.calls.some(call => call.name === 'room_chat_cleanup_ack'))
 assert.equal((await f.handler(action('cleanup', { 'x-cleanup-key': 'a'.repeat(64) }, false))).status, 200)
 assert.equal(f.objects.size, 0)
 assert.ok(f.calls.some(call => call.name === 'room_chat_cleanup_ack'))
})

test('stream limits cancel oversized bodies without relying on Content-Length', async () => {
 let cancelled = false
 const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5)); controller.enqueue(new Uint8Array(5)) }, cancel() { cancelled = true } })
 await assert.rejects(readBounded(new Request('https://example.invalid', { method: 'POST', body, duplex: 'half' }), 8), error => error.status === 413)
 assert.equal(cancelled, true)
})
