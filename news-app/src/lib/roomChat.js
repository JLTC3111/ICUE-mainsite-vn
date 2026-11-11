import { supabase } from './supabase'
import { withDeadline } from '../../../shared/resilience/requests.js'

export async function roomChatRpc(name, args = {}, { signal } = {}) {
  return withDeadline(async requestSignal => {
    const { data, error } = await supabase.rpc(`room_chat_${name}`, args).abortSignal(requestSignal)
    if (error) throw error
    return data
  }, { signal, timeoutMs: 12_000 })
}

export function validateRoomFile(file) {
  const extension = file?.name?.split('.').at(-1)?.toLowerCase()
  const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4' }[extension]
  const types = new Set(['', 'application/octet-stream', mime])
  if (mime === 'image/jpeg') { types.add('image/jpg'); types.add('image/pjpeg') }
  if (!mime || !file.size || file.size > 4 * 1024 * 1024 || !types.has(file.type)) throw new Error('ROOM_FILE_TYPE_SIZE')
}

async function roomFileRequest(body, { signal } = {}) {
  const session = await supabase.auth.getSession()
  if (session.error || !session.data?.session) throw new Error('ROOM_AUTH')
  const headers = { Authorization: `Bearer ${session.data.session.access_token}` }
  const form = body instanceof FormData
  if (!form) headers['Content-Type'] = 'application/json'
  return withDeadline(async requestSignal => {
    const response = await fetch('/.netlify/functions/room-chat-files', { method: 'POST', credentials: 'omit', cache: 'no-store', headers, body: form ? body : JSON.stringify(body), signal: requestSignal })
    if (!response.ok) throw Object.assign(new Error('ROOM_FILE_FAILED'), { status: response.status })
    return response
  }, { signal, timeoutMs: 90_000 })
}

export async function recordRoomNetwork({ signal } = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) return
  await withDeadline(async requestSignal => {
    await fetch('/.netlify/functions/room-chat-network', { method: 'POST', credentials: 'omit', cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: '{}', signal: requestSignal })
  }, { signal, timeoutMs: 10_000 })
}

export async function uploadRoomFile(roomId, file, clientId, options) {
  validateRoomFile(file)
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('room_id', roomId)
  form.append('client_id', clientId)
  return (await roomFileRequest(form, options)).json()
}

export async function discardRoomFile(roomId, fileId, options) {
  await roomFileRequest({ action: 'discard', room_id: roomId, file_id: fileId }, options)
}

export async function downloadRoomFile(roomId, file, options) {
  const response = await roomFileRequest({ action: 'download', room_id: roomId, file_id: file.id }, options)
  const blob = await response.blob()
  if (options?.signal?.aborted) return
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = file.name
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
