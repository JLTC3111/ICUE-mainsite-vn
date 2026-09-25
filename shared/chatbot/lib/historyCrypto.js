import { mergeHistories } from './historyStore.js'

const encoder = new TextEncoder()
const PREFIX = 'icue1.'
const toBase64 = bytes => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
const fromBase64 = text => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))

export function createPairingCode() {
  return PREFIX + toBase64(crypto.getRandomValues(new Uint8Array(32)))
}

export function normalizePairingCode(input) {
  const code = String(input || '').trim()
  if (!/^icue1\.[A-Za-z0-9_-]{43}$/.test(code)) throw new Error('invalid_code')
  const bytes = fromBase64(code.slice(PREFIX.length))
  if (bytes.length !== 32 || PREFIX + toBase64(bytes) !== code) throw new Error('invalid_code')
  return code
}

/** Independent authentication and encryption keys derived from 256 random bits.
 * The pairing code and encryption key never leave the browser. */
async function keys(code) {
  const secret = fromBase64(normalizePairingCode(code).slice(PREFIX.length))
  const material = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits', 'deriveKey'])
  const parameters = purpose => ({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('icue-chat-v1'), info: encoder.encode(purpose) })
  const auth = new Uint8Array(await crypto.subtle.deriveBits(parameters('authentication'), material, 256))
  const key = await crypto.subtle.deriveKey(parameters('encryption'), material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  return { token: [...auth].map(byte => byte.toString(16).padStart(2, '0')).join(''), key }
}

export async function createHistoryCipher(code) {
  const { token, key } = await keys(code)
  const additionalData = encoder.encode('icue-chat-history-v1')
  return {
    token,
    async encrypt(history) {
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const data = encoder.encode(JSON.stringify({ version: 1, history: mergeHistories(history) }))
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, data)
      return { version: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) }
    },
    async decrypt(payload) {
      if (payload?.version !== 1 || typeof payload.iv !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(payload.iv) || typeof payload.data !== 'string' || payload.data.length > 1_500_000) throw new Error('invalid_payload')
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv), additionalData }, key, fromBase64(payload.data))
      const parsed = JSON.parse(new TextDecoder().decode(plaintext))
      if (parsed?.version !== 1 || !parsed.history || typeof parsed.history !== 'object') throw new Error('invalid_payload')
      return mergeHistories(parsed.history)
    },
  }
}
