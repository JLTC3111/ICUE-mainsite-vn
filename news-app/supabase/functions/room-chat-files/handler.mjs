export const IMAGE_LIMIT = 4 * 1024 * 1024
export const VIDEO_LIMIT = 4 * 1024 * 1024
export const IMAGE_PIXELS = 8_000_000
const BUCKET = 'room-chat'
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const pathPattern = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(png|jpe?g|webp|mp4)$/i
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cleanup-key', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const json = (body, status = 200) => Response.json(body, { status, headers: cors })
export const mediaIssue = (message, status = 400) => Object.assign(new Error(message), { status })
const ascii = (bytes, start, count) => String.fromCharCode(...bytes.subarray(start, start + count))
const extensions = { 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'image/webp': ['webp'], 'video/mp4': ['mp4'] }
const extensionFor = mime => extensions[mime]?.[0]

// A complete JPEG ends at its EOI marker. Cameras and editors often leave
// padding after that marker; sanitizing rewrites the image and drops the tail.
function completeJpeg(bytes) {
 if (bytes.length < 12 || bytes[0] !== 255 || bytes[1] !== 216) return false
 let index = 2
 const marker = () => {
  if (index >= bytes.length || bytes[index] !== 255) return -1
  while (index < bytes.length && bytes[index] === 255) index += 1
  if (index >= bytes.length) return -1
  return bytes[index++]
 }
 while (index < bytes.length) {
  const kind = marker()
  if (kind < 0 || kind === 216) return false
  if (kind === 217) return true
  if (kind === 1 || (kind >= 208 && kind <= 215)) continue
  if (index + 2 > bytes.length) return false
  const length = (bytes[index] << 8) | bytes[index + 1]
  if (length < 2 || index + length > bytes.length) return false
  index += length
  if (kind !== 218) continue
  while (index < bytes.length) {
   if (bytes[index] !== 255) { index += 1; continue }
   const next = marker()
   if (next === 0) continue
   if (next === 217) return true
   if (next >= 208 && next <= 215) continue
   return false
  }
  return false
 }
 return false
}

export function inspectMedia(bytes, name, declared = '') {
 if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > VIDEO_LIMIT) throw mediaIssue('Choose a complete image or MP4 video up to 4 MB.', 413)
 let mime
 if (bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) mime = 'image/png'
 else if (completeJpeg(bytes)) mime = 'image/jpeg'
 else if (bytes.length >= 20 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
  if (new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 !== bytes.length) throw mediaIssue('This WebP file is incomplete or corrupt.')
  mime = 'image/webp'
 } else if (bytes.length >= 24 && ascii(bytes, 4, 4) === 'ftyp') mime = 'video/mp4'
 const extension = name.toLowerCase().split('.').at(-1)
 const jpegAlias = mime === 'image/jpeg' && (declared === 'image/jpg' || declared === 'image/pjpeg')
 if (!mime || !extensions[mime].includes(extension) || (declared && declared !== 'application/octet-stream' && declared !== mime && !jpegAlias)) throw mediaIssue('Only PNG, JPG, JPEG, WebP and MP4 files with matching file content are accepted.', 415)
 if (mime !== 'video/mp4' && bytes.length > IMAGE_LIMIT) throw mediaIssue('Images must be no larger than 4 MB.', 413)
 return mime
}

export async function readBounded(request, limit) {
 if (Number(request.headers.get('content-length')) > limit) throw mediaIssue('Request too large.', 413)
 const reader = request.body?.getReader(), chunks = []
 let size = 0
 if (!reader) return new Uint8Array()
 while (true) {
  const { done, value } = await reader.read()
  if (done) break
  size += value.byteLength
  if (size > limit) { await reader.cancel(); throw mediaIssue('Request too large.', 413) }
  chunks.push(value)
 }
 const bytes = new Uint8Array(size)
 let offset = 0
 for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
 return bytes
}
const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('')
async function call(client, name, args = {}, prefix = 'room_chat_') {
 const { data, error } = await client.rpc(`${prefix}${name}`, args)
 if (error) {
  const status = error.code === '42501' ? 403 : ['P0001', '54000'].includes(error.code) ? 429 : error.code === '23505' ? 409 : ['22023', '23514'].includes(error.code) ? 400 : 503
  throw mediaIssue(status === 403 ? 'File or room unavailable.' : status === 429 ? 'Upload limit reached. Please try again later.' : status === 409 ? 'This upload ID was already used for another file.' : status === 400 ? 'This file is no longer available.' : 'The file service is temporarily unavailable.', status)
 }
 return data
}
const assertUuid = value => { if (typeof value !== 'string' || !uuid.test(value)) throw mediaIssue('Invalid file or room identifier.'); return value }
function checkedPath(file, roomId = null) {
 if (!file || !pathPattern.test(file.path || '') || (roomId && !file.path.toLowerCase().startsWith(`${roomId.toLowerCase()}/`))) throw mediaIssue('Invalid file reservation.', 503)
 return file.path
}

// Storage is reached only after the database verifies the account and current
// room membership. Only regenerated bytes are stored; original uploads live in
// request memory. Decoders/transcoders are injected by the hosting adapter.
export function createRoomFilesHandler({ userClient, admin, sanitizeImage, sanitizeVideo = undefined }) {
 async function rejectFile(file) {
  // Queue first: failure or process termination during physical removal leaves
  // a durable cleanup entry. A corrupt file stops being downloadable at once.
  await call(admin, 'file_reject', { p_id: file.id })
  await admin.storage.from(BUCKET).remove([checkedPath(file)])
 }
 return async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405)
  try {
   const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data')
   if (multipart && !/^Bearer \S+$/i.test(request.headers.get('authorization') || '')) throw mediaIssue('Sign in to upload files.', 401)
   const raw = await readBounded(request, multipart ? VIDEO_LIMIT + 64 * 1024 : 4096)
   if (multipart) {
    let form
    try { form = await new Response(raw, { headers: { 'Content-Type': request.headers.get('content-type') } }).formData() } catch { throw mediaIssue('The file upload is incomplete.') }
    const file = form.get('file'), roomId = assertUuid(form.get('room_id')), clientId = assertUuid(form.get('client_id'))
    if (!file || typeof file === 'string') throw mediaIssue('Choose an image or MP4 file.')
    const client = userClient(request)
    await call(client, 'file_authorize', { p_room_id: roomId })
    const original = new Uint8Array(await file.arrayBuffer())
    const originalName = file.name.normalize('NFKC').replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 160)
    const mime = inspectMedia(original, originalName, file.type)
    const sanitize = mime === 'video/mp4' ? sanitizeVideo : sanitizeImage
    if (!sanitize) throw mediaIssue(mime === 'video/mp4' ? 'Video sanitization is unavailable on this server.' : 'Image sanitization is unavailable on this server.', 415)
    let safe
    try { safe = await sanitize(original, mime) } catch (error) { throw error.status ? error : mediaIssue('The file is incomplete, corrupt or incompatible. Choose another file.') }
    if (!safe || !(safe.bytes instanceof Uint8Array) || !extensions[safe.mime] || (mime === 'video/mp4') !== (safe.mime === 'video/mp4')) throw mediaIssue('The file could not be sanitized.', 503)
    const name = `${originalName.replace(/\.[^.]*$/, '') || 'file'}.${extensionFor(safe.mime)}`
    inspectMedia(safe.bytes, name, safe.mime)
    const hash = await digest(safe.bytes)
    const reserved = await call(client, 'file_reserve', { p_room_id: roomId, p_client_id: clientId, p_name: name, p_mime: safe.mime, p_size: safe.bytes.length, p_sha256: hash })
    checkedPath(reserved, roomId)
    if ((reserved.status || reserved.state) !== 'ready') {
     const { error } = await admin.storage.from(BUCKET).upload(reserved.path, safe.bytes, { contentType: safe.mime, cacheControl: '0', upsert: false })
     if (error) {
      if (String(error.statusCode) !== '409' && !/already exists|duplicate/i.test(error.message || '')) throw mediaIssue('The upload failed. Please retry.', 503)
      const existing = await admin.storage.from(BUCKET).download(reserved.path)
      if (existing.error || !existing.data || existing.data.size !== safe.bytes.length || await digest(new Uint8Array(await existing.data.arrayBuffer())) !== hash) {
       await rejectFile(reserved)
       throw mediaIssue('The stored file failed verification. Choose the file again.', 409)
      }
     }
    }
    try { return json(await call(admin, 'file_ready', { p_id: reserved.id, p_size: safe.bytes.length, p_sha256: hash })) }
    catch (error) {
     // An acknowledgement lost to a network error may have committed. Retain
     // the reservation for an idempotent retry; never delete on uncertainty.
     if (error.status < 500) await rejectFile(reserved)
     throw error
    }
   }
   let body
   try { body = JSON.parse(new TextDecoder().decode(raw)) } catch { throw mediaIssue('Invalid request.') }
   if (!body || typeof body !== 'object' || Array.isArray(body)) throw mediaIssue('Invalid request.')
   if (body.action === 'cleanup') {
    const key = request.headers.get('x-cleanup-key') || ''
    if (!/^[a-f0-9]{64}$/.test(key) || !await call(admin, 'cleanup_key_valid', { p_key: key }, 'support_chat_')) throw mediaIssue('Not authorized.', 403)
    const batch = await call(admin, 'cleanup_batch'), paths = batch?.paths || []
    if (!Array.isArray(paths) || paths.length > 100 || paths.some(path => typeof path !== 'string' || !pathPattern.test(path))) throw mediaIssue('Invalid cleanup batch.', 503)
    if (paths.length) {
     const { error } = await admin.storage.from(BUCKET).remove(paths)
     if (error) throw mediaIssue('Storage cleanup will retry.', 503)
     await call(admin, 'cleanup_ack', { p_paths: paths })
    }
    return json({ files_deleted: paths.length })
   }
   if (!/^Bearer \S+$/i.test(request.headers.get('authorization') || '')) throw mediaIssue('Sign in to access files.', 401)
   const roomId = assertUuid(body.room_id), fileId = assertUuid(body.file_id)
   const client = userClient(request)
   if (body.action === 'discard') {
    await call(client, 'file_discard', { p_room_id: roomId, p_file: fileId })
    return json({ ok: true })
   }
   if (body.action !== 'download') throw mediaIssue('Unknown action.')
   const file = await call(client, 'file_download', { p_room_id: roomId, p_file: fileId })
   checkedPath(file, roomId)
   const { data, error } = await admin.storage.from(BUCKET).download(file.path)
   if (error || !data) throw mediaIssue('File unavailable.', 404)
   if (!extensions[file.mime] || data.size !== file.size || await digest(new Uint8Array(await data.arrayBuffer())) !== file.sha256) {
    await rejectFile(file)
    throw mediaIssue('This file failed verification and was removed.', 410)
   }
   const safeName = String(file.name).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180)
   return new Response(data, { headers: { ...cors, 'Content-Type': file.mime, 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': `attachment; filename="download.${extensionFor(file.mime)}"; filename*=UTF-8''${encodeURIComponent(safeName).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())}` } })
  } catch (error) { return json({ error: error.status ? error.message : 'The file service is temporarily unavailable.' }, error.status || 503) }
 }
}
