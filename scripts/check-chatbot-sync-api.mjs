// Run only against the disposable local QA gateway, never production.
import assert from 'node:assert/strict'
import { createPairingCode, createHistoryCipher } from '../shared/chatbot/lib/historyCrypto.js'
import { createHistoryApi } from '../shared/chatbot/lib/historyApi.js'
const cipher = await createHistoryCipher(createPairingCode())
const endpoint = 'http://127.0.0.1:3117/.netlify/functions/chat-history'
const api = createHistoryApi({ endpoint })
const payload = await cipher.encrypt({ en: [{ id: 'qa-real-api', role: 'user', content: 'Local integration check', timestamp: new Date().toISOString() }] })
const created = await api(cipher.token, { method: 'PUT', body: { revision: 0, payload } })
assert.equal(created.revision, 1)
try {
  const loaded = await api(cipher.token)
  assert.equal((await cipher.decrypt(loaded.payload)).en[0].content, 'Local integration check')
  await assert.rejects(api(cipher.token, { method: 'PUT', body: { revision: 0, payload } }), { status: 409 })
  await api(cipher.token, { method: 'PUT', body: { revision: 1, payload } })
  await assert.rejects(api(cipher.token, { method: 'PUT', body: { revision: 1, payload } }), { status: 409 })
  const anonymous = await fetch('http://127.0.0.1:3117/rest/v1/chat_history_vaults?select=id')
  assert.ok([401, 403].includes(anonymous.status))
} finally { await api(cipher.token, { method: 'DELETE' }) }
await assert.rejects(api(cipher.token), { status: 404 })
process.stdout.write('PASS: real handler, PostgREST, Postgres, encryption, conflicts, access denial and deletion\n')
