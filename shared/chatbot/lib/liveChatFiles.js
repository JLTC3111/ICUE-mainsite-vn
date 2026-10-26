import { withDeadline } from '../../resilience/requests.js'
import { accountToken } from '../../customer-account/account.js'
export const LIVE_FILE_LIMIT = 10 * 1024 * 1024
export function validateChatFile(file) {
 if (!file || !/\.(pdf|png|jpe?g)$/i.test(file.name) || !['','application/octet-stream','application/pdf','image/png','image/jpeg'].includes(file.type) || file.size < 1 || file.size > LIVE_FILE_LIMIT) throw new Error('FILE_TYPE_OR_SIZE')
}
export async function supportFileRequest(config, body, { signal, timeoutMs = 90_000, accessToken } = {}) {
 const token = accessToken === undefined ? await accountToken() : accessToken
 return withDeadline(async requestSignal => {
  const headers = { apikey: config.anonKey, Authorization: `Bearer ${token || config.anonKey}` }
  const isForm = body instanceof FormData
  if (!isForm) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${config.url.replace(/\/$/,'')}/functions/v1/support-chat-files`, { method: 'POST', credentials: 'omit', cache: 'no-store', headers, body: isForm ? body : JSON.stringify(body), signal: requestSignal })
  if (!response.ok) throw Object.assign(new Error('FILE_REQUEST_FAILED'), { status: response.status })
  return response
 }, { signal, timeoutMs })
}
export async function uploadChatFile(config, file, identity, clientId, options) {
 validateChatFile(file)
 const form = new FormData()
 form.append('file', file, file.name)
 form.append('conversation_id', identity.id)
 form.append('client_id', clientId)
 if (identity.token) form.append('token', identity.token)
 return (await supportFileRequest(config, form, options)).json()
}
export async function downloadChatFile(config, file, identity, options) {
 const response = await supportFileRequest(config, { action: 'download', file_id: file.id, conversation_id: identity.id, token: identity.token || null }, options)
 const url = URL.createObjectURL(await response.blob()), link = document.createElement('a')
 link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove()
 setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
