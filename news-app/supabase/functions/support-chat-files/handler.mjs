export const FILE_LIMIT = 10 * 1024 * 1024
const BUCKET = 'support-chat'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cleanup-key', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const json = (body, status = 200) => Response.json(body, { status, headers: cors })
const issue = (message, status = 400) => Object.assign(new Error(message), { status })
export function inspectFile(bytes, name, declared = '') {
 if (!bytes.length || bytes.length > FILE_LIMIT) throw issue('Files must be smaller than 10 MB.')
 const extension = name.toLowerCase().split('.').at(-1)
 let mime
 if (bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-') mime = 'application/pdf'
 else if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), width = view.getUint32(16), height = view.getUint32(20)
  if (!width || !height || width * height > 100_000_000) throw issue('This image is too large.')
  mime = 'image/png'
 } else if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217) mime = 'image/jpeg'
 const extensions = { 'application/pdf': ['pdf'], 'image/png': ['png'], 'image/jpeg': ['jpg','jpeg'] }
 if (!mime || !extensions[mime].includes(extension) || (declared && declared !== 'application/octet-stream' && declared !== mime)) throw issue('Only PDF, PNG and JPEG files are accepted.')
 return mime
}
export async function readBounded(request, limit) {
 if (Number(request.headers.get('content-length')) > limit) throw issue('Request too large.', 413)
 const reader = request.body?.getReader(), chunks = []
 let size = 0
 if (!reader) return new Uint8Array()
 while (true) {
  const { done, value } = await reader.read()
  if (done) break
  size += value.byteLength
  if (size > limit) { await reader.cancel(); throw issue('Request too large.', 413) }
  chunks.push(value)
 }
 const body = new Uint8Array(size)
 let offset = 0
 for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
 return body
}
const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2,'0')).join('')
async function call(client, name, args = {}) {
 const { data, error } = await client.rpc(`support_chat_${name}`, args)
 if (error) throw issue(error.code === '42501' ? 'File or conversation unavailable.' : error.code === 'P0001' ? 'Upload limit reached. Please try again later.' : 'Unable to process this file.', error.code === '42501' ? 403 : error.code === 'P0001' ? 429 : 400)
 return data
}
export function createSupportFilesHandler({ userClient, admin }) {
 return async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405)
  try {
   const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data')
   const raw = await readBounded(request, multipart ? FILE_LIMIT + 64 * 1024 : 4096)
   if (multipart) {
    const form = await new Response(raw, { headers: { 'Content-Type': request.headers.get('content-type') } }).formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') throw issue('Choose a PDF, PNG or JPEG file.')
    const bytes = new Uint8Array(await file.arrayBuffer()), name = file.name.normalize('NFKC').replace(/[\u0000-\u001f\u007f/\\]/g,'_').slice(0,180)
    const mime = inspectFile(bytes, name, file.type), hash = await digest(bytes)
    const client = userClient(request)
    const reserved = await call(client, 'file_reserve', { p_token: form.get('token') || null, p_conversation_id: form.get('conversation_id'), p_client_id: form.get('client_id'), p_name: name, p_mime: mime, p_size: bytes.length, p_sha256: hash })
    if (reserved.state !== 'ready') {
     const { error } = await admin.storage.from(BUCKET).upload(reserved.path, bytes, { contentType: mime, cacheControl: '0', upsert: false })
     if (error) {
      if (String(error.statusCode) !== '409' && !/already exists|duplicate/i.test(error.message || '')) throw issue('The upload failed. Please retry.', 503)
      const existing = await admin.storage.from(BUCKET).download(reserved.path)
      if (existing.error || !existing.data || await digest(new Uint8Array(await existing.data.arrayBuffer())) !== hash) throw issue('The upload could not be verified.', 409)
     }
    }
    try { return json(await call(admin, 'file_ready', { p_id: reserved.id })) }
    catch (error) { await admin.storage.from(BUCKET).remove([reserved.path]); throw error }
   }
   let body
   try { body = JSON.parse(new TextDecoder().decode(raw)) } catch { throw issue('Invalid request.') }
   if (body.action === 'cleanup') {
    const key = request.headers.get('x-cleanup-key') || ''
    if (!/^[a-f0-9]{64}$/.test(key) || !await call(admin, 'cleanup_key_valid', { p_key: key })) throw issue('Not authorized.',403)
    const batch = await call(admin, 'cleanup_batch'), paths = batch.paths || []
    if (paths.length > 100 || paths.some(path => !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(pdf|png|jpe?g)$/.test(path))) throw issue('Invalid cleanup batch.',500)
    if (paths.length) {
     const { error } = await admin.storage.from(BUCKET).remove(paths)
     if (error) throw issue('Storage cleanup will retry.',503)
     await call(admin,'cleanup_ack',{p_paths:paths})
    }
    return json({ conversations_deleted: batch.conversations_deleted, files_deleted: paths.length })
   }
   if (body.action !== 'download') throw issue('Unknown action.')
   const file = await call(userClient(request),'file_download',{p_token:body.token || null,p_conversation_id:body.conversation_id,p_file:body.file_id})
   const { data, error } = await admin.storage.from(BUCKET).download(file.path)
   if (error || !data) throw issue('File unavailable.',404)
   return new Response(data,{headers:{...cors,'Content-Type':file.mime,'Content-Disposition':`attachment; filename="download.${file.mime==='application/pdf'?'pdf':file.mime==='image/png'?'png':'jpg'}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`}})
  } catch (error) { return json({ error: error.status ? error.message : 'The file service is temporarily unavailable.' }, error.status || 503) }
 }
}
