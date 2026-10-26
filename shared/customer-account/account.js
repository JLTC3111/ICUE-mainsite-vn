import { createRetryableLoader, withDeadline } from '../resilience/requests.js'
let snapshot = { user: null, status: 'idle' }, accessToken = null
const listeners = new Set()
const publish = next => { snapshot = { ...snapshot, ...next }; listeners.forEach(listener => listener()) }
const loadClient = createRetryableLoader(async () => (await import('../../news-app/src/lib/supabaseLoader.js')).loadSupabaseClient())
let connecting
export const getAccountSnapshot = () => snapshot
export const subscribeAccount = listener => { listeners.add(listener); return () => listeners.delete(listener) }
export const cachedAccountToken = () => accessToken
function savedSession() {
 try { for (let index = 0; index < localStorage.length; index++) { const key = localStorage.key(index); if (key?.startsWith('sb-') && key.endsWith('-auth-token')) return true } } catch { /* Storage can be blocked. */ }
 return false
}
export function connectAccount() {
 if (connecting) return connecting
 publish({ status: 'loading' })
 connecting = (async () => {
  const client = await loadClient()
  const apply = session => {
   const user = session?.user && !session.user.is_anonymous ? session.user : null
   accessToken = user ? session.access_token : null
   publish({ user, status: 'ready' })
  }
  client.auth.onAuthStateChange((_event, session) => { apply(session) })
  const { data, error } = await withDeadline(() => client.auth.getSession())
  if (error) throw error
  apply(data.session)
  return client
 })().catch(error => { connecting = null; publish({ status: 'error' }); throw error })
 return connecting
}
export async function accountToken() {
 if (!snapshot.user && snapshot.status === 'idle' && savedSession()) await connectAccount()
 if (!snapshot.user) return null
 const client = await loadClient()
 const { data, error } = await withDeadline(() => client.auth.getSession())
 if (error || !data.session) throw new Error('Account session unavailable')
 accessToken = data.session.access_token
 return accessToken
}
export function customerPortalUrl(locale = 'vi') {
 const query = new URLSearchParams({ lang: String(locale).split('-')[0], return: typeof window === 'undefined' ? '/' : window.location.pathname })
 return `/newsroom/portal?${query}`
}
