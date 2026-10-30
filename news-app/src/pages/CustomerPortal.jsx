import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Eye, EyeOff, MessageSquare, ShieldCheck, FileText, Monitor, UserRound, Plus, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getAuthRedirectUrl } from '../lib/authRedirect'
import { authErrorKey, sendPasswordResetEmail } from '../lib/authReset'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { portalCopy } from '../../../shared/customer-account/portalCopy.js'
import { connectAccount } from '../../../shared/customer-account/account.js'
import { getLiveChatClient } from '../../../shared/chatbot/lib/liveChat.js'
import { liveChatCopy } from '../../../shared/chatbot/lib/liveChatCopy.js'
import LiveChatPanel from '../../../shared/chatbot/LiveChatPanel.jsx'
import './CustomerPortal.css'

export default function CustomerPortal() {
 const { t, i18n } = useTranslation(), navigate = useNavigate(), location = useLocation()
 const { user, profile, signIn, signOut, loading } = useAuth()
 const identity = user?.id || null
 const [stateIdentity, setStateIdentity] = useState(identity)
 const locale = i18n.resolvedLanguage || i18n.language || 'vi', copy = portalCopy(locale), labels = liveChatCopy(locale)
 const params = new URLSearchParams(location.search), staff = params.get('mode') === 'staff'
 const [mode, setMode] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState(''), [showPassword, setShowPassword] = useState(false)
 const [confirmPassword, setConfirmPassword] = useState(''), [confirmTouched, setConfirmTouched] = useState(false), [showConfirmPassword, setShowConfirmPassword] = useState(false)
 const confirmRef = useRef(null)
 const passwordMismatch = !staff && mode === 'signup' && confirmTouched && password !== confirmPassword
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [chats, setChats] = useState([]), [listError, setListError] = useState(false), [revision, setRevision] = useState(0)
 const busyRef = useRef(false), live = getLiveChatClient(), state = useSyncExternalStore(live.subscribe, live.getSnapshot, live.getSnapshot)
 useDocumentTitle(staff ? copy.staff : copy.customer)
 useEffect(() => { void connectAccount().catch(() => {}) }, [])
 const lastMessageId = state.messages.at(-1)?.id
 useEffect(() => {
  if (!user || staff) return undefined
  let alive = true
  void supabase.rpc('support_chat_customer_chats').then(({data,error}) => {
   if (!alive) return
   setListError(Boolean(error)); if (!error) setChats(data?.conversations || [])
  }).catch(() => { if (alive) setListError(true) })
  return () => { alive = false }
 }, [user, staff, lastMessageId, state.conversation?.id, revision])
 // Discard identity-bound state before React commits this account's view.
 // Keep the pending submit mounted so its handoff errors and native return
 // navigation still complete after a successful sign-in changes the identity.
 if (stateIdentity !== identity) {
  setStateIdentity(identity); setMode('login'); setEmail(''); setName(''); clearCredentials()
  setChats([]); setListError(false)
 }
 function clearCredentials() {
  setPassword(''); setConfirmPassword(''); setConfirmTouched(false); setShowPassword(false); setShowConfirmPassword(false)
 }
 function formMode(next) {
  setMode(next); setError(''); setNotice(''); setConfirmPassword(''); setConfirmTouched(false); setShowConfirmPassword(false)
 }
 function portal(next) {
  const query = new URLSearchParams({lang:locale}); if (next) query.set('mode','staff')
  navigate(`/portal?${query}`); formMode('login')
 }
 async function submit(event) {
  event.preventDefault(); if (busyRef.current) return
  if (!staff && mode === 'signup' && password !== confirmPassword) {
   setConfirmTouched(true); setError(''); confirmRef.current?.focus(); return
  }
  busyRef.current = true; setBusy(true); setError(''); setNotice('')
  try {
   if (mode === 'reset') {
    const redirectTo = getAuthRedirectUrl('login')
    let result = await sendPasswordResetEmail(email.trim(),redirectTo)
    if (result.error && String(result.error.code || '').startsWith('http_404')) result = await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo})
    if (result.error) throw result.error
    setNotice(t('login.resetSent')); return
   }
   if (!staff && mode === 'signup') {
    const result = await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()},emailRedirectTo:getAuthRedirectUrl('login')}})
    if (result.error) throw result.error
    if (!result.data?.session) { clearCredentials(); setNotice(copy.confirmEmail); return }
    const signed = await signIn(email.trim(),password); if (signed.error) throw signed.error
   } else {
    const result = await signIn(email.trim(),password)
    if (result.error) throw result.error
   }
   clearCredentials()
   const {data:account,error:accountError} = await supabase.rpc('support_chat_account')
   if (accountError || !account) throw accountError || new Error('ACCOUNT_UNAVAILABLE')
   if (staff) {
    if (!['admin','author'].includes(account.role)) { setError(copy.staffDenied); return }
    const from = location.state?.from
    const target = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && (from !== '/support' || account.role === 'admin') ? from : account.role === 'admin' ? '/support' : '/dashboard'
    navigate(target,{replace:true}); return
   }
   const client = await connectAccount(), session = await client.auth.getSession()
   await live.syncAccount(session.data.session?.user)
   const back = params.get('return')
   if (back?.startsWith('/') && !back.startsWith('//') && !back.startsWith('/newsroom')) {
    live.saveDraft()
    try { sessionStorage.setItem('icue:open-team-chat','1') } catch { /* Account portal still preserves the thread. */ }
    const returnUrl = new URL(back, window.location.origin); returnUrl.searchParams.set('lang',locale)
    window.location.assign(returnUrl.pathname + returnUrl.search); return
   }
  } catch (err) { setError(err?.code === 'invalid_credentials' ? t('login.error') : mode === 'reset' ? t(authErrorKey(err)) : err?.code === 'email_not_confirmed' ? copy.confirmEmail : err?.code === 'weak_password' ? t('login.resetTooShort') : /rate_limit/.test(err?.code || '') ? t('login.resetRateLimit') : copy.connectionError) }
  finally { busyRef.current = false; setBusy(false) }
 }
 async function logout() { if (busyRef.current) return; setBusy(true); try { const result = await signOut(); if (result.error) throw result.error; clearCredentials(); await live.syncAccount(null); setChats([]); setError('') } catch { setError(copy.connectionError) } finally { setBusy(false) } }
 const selected = state.conversation?.id
 const tabs = <nav className="customer-portal__tabs" aria-label={copy.customer}><button type="button" aria-pressed={!staff} onClick={() => portal(false)}><UserRound size={16} aria-hidden="true" />{copy.customer}</button><button type="button" aria-pressed={staff} onClick={() => portal(true)}><ShieldCheck size={16} aria-hidden="true" />{copy.staff}</button></nav>
 const brand = <a className="customer-portal__brand" href={`/?lang=${locale}`} aria-label="ICUE"><img className="customer-portal__brand-mark" src="/logoIcons/ICUE_Radial_Parcel_Dark_A_Transparent.svg" width="36" height="36" alt="" aria-hidden="true" />ICUE</a>
 if (user && !staff) return <main className="customer-portal customer-portal--workspace" data-icue-chat-theme="light">
  <header className="customer-portal__workspace-header">{brand}<span>{copy.customer}</span><LanguageSwitcher /><button type="button" onClick={logout} disabled={busy}><LogOut size={16} aria-hidden="true" />{copy.signOut}</button></header>
  <div className="customer-portal__workspace-title"><div><h1>{copy.savedChats}</h1><p>{user.email}</p></div><a href={`/?lang=${locale}`}><ArrowLeft size={16} aria-hidden="true" />{copy.back}</a></div>
  {error && <p className="customer-portal__error" role="alert">{error}</p>}
  <div className="customer-portal__workspace-grid"><aside className="customer-portal__conversations"><button type="button" className="customer-portal__new" onClick={() => live.newConversation()}><Plus size={17} aria-hidden="true" />{copy.newChat}</button>
   {listError && <p role="alert">{copy.saveError} <button type="button" onClick={() => setRevision(n => n+1)}>{labels.retry}</button></p>}
   {!chats.length && !listError && <p>{copy.empty}</p>}
   {chats.map(chat => <button key={chat.id} type="button" className="customer-portal__conversation" aria-pressed={selected === chat.id} onClick={() => live.selectConversation(chat.id)}><strong>{chat.preview || labels.photosFiles}</strong><small>{new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(chat.updated_at))} · {chat.status === 'closed' ? labels.resolved : labels.active}</small></button>)}
   <div className="customer-portal__portal-links">{tabs}</div>
  </aside><section className="customer-portal__chat" aria-label={labels.title}><div className="customer-portal__chat-heading"><MessageSquare size={19} aria-hidden="true" /><h2 id="customer-chat-title">{labels.title}</h2></div><LiveChatPanel active locale={locale} labels={labels} contactUrl={`/contact?lang=${locale}`} client={live} id="customer-chat" labelledBy="customer-chat-title" /></section></div>
 </main>
 return <main className="customer-portal" data-icue-chat-theme="light"><section className="customer-portal__intro"><header>{brand}<a href={`/?lang=${locale}`}><ArrowLeft size={15} aria-hidden="true" />{copy.back}</a></header><div className="customer-portal__intro-content"><span className="customer-portal__eyebrow">{staff ? copy.staff : copy.customer}</span><h1>{staff ? copy.staff : copy.title}</h1><p>{staff ? copy.staffIntro : copy.intro}</p><ul>{[[MessageSquare,copy.keep],[FileText,copy.files],[Monitor,copy.anyDevice]].map(([Icon,text]) => <li key={text}><Icon size={18} strokeWidth={1.5} aria-hidden="true" />{text}</li>)}</ul></div><p className="customer-portal__intro-note">{staff ? copy.staffOnly : labels.guestRetention}</p></section>
  <section className="customer-portal__entry"><div className="customer-portal__language"><LanguageSwitcher /></div><div className="customer-portal__form-shell">{tabs}<h2>{mode === 'reset' ? t('login.forgot') : !staff && mode === 'signup' ? copy.signup : staff ? copy.staff : t('login.title')}</h2><p>{staff ? copy.staffOnly : mode === 'signup' ? copy.signupHint : copy.intro}</p>
   {user && staff ? <div className="customer-portal__account-choice">{['admin','author'].includes(profile?.role) ? <button type="button" className="customer-portal__primary" onClick={() => navigate(profile.role === 'admin' ? '/support' : '/dashboard')}>{profile.role === 'admin' ? labels.inbox : t('login.submit')}<ArrowRight size={17} aria-hidden="true" /></button> : <p role="alert">{copy.staffDenied}</p>}<button type="button" onClick={logout} disabled={busy}>{copy.signOut}</button></div> : <form onSubmit={submit}>
    {!staff && mode === 'signup' && <label>{copy.name}<input name="name" autoComplete="name" value={name} maxLength={100} required onChange={event => setName(event.target.value)} /></label>}
    <label>{t('login.email')}<input name="email" type="email" autoComplete="username" autoCapitalize="none" required value={email} onChange={event => setEmail(event.target.value)} /></label>
    {mode !== 'reset' && <label>{t('login.password')}<span className="customer-portal__password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={event => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(show => !show)} aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span></label>}
    {!staff && mode === 'signup' && <label>{t('login.confirmPassword')}<span className="customer-portal__password"><input ref={confirmRef} name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} aria-invalid={passwordMismatch || undefined} aria-describedby={passwordMismatch ? 'customer-password-mismatch' : undefined} onChange={event => setConfirmPassword(event.target.value)} onBlur={() => setConfirmTouched(true)} /><button type="button" onClick={() => setShowConfirmPassword(show => !show)} aria-label={`${t(showConfirmPassword ? 'login.hidePassword' : 'login.showPassword')}: ${t('login.confirmPassword')}`}>{showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span></label>}
    {passwordMismatch && <p id="customer-password-mismatch" className="customer-portal__error" role="alert">{t('login.resetMismatch')}</p>}
    {mode === 'signup' && <small>{t('login.resetTooShort')}</small>}
    {error && <p className="customer-portal__error" role="alert">{error}</p>}{notice && <p className="customer-portal__notice" role="status">{notice}</p>}
    <button type="submit" className="customer-portal__primary" disabled={busy || loading}>{busy ? t('login.loading') : mode === 'reset' ? t('login.forgot') : mode === 'signup' && !staff ? copy.signup : t('login.submit')}<ArrowRight size={17} aria-hidden="true" /></button>
    <button type="button" className="customer-portal__text" onClick={() => formMode(mode === 'reset' ? 'login' : 'reset')}>{mode === 'reset' ? t('login.title') : t('login.forgot')}</button>
    {!staff && mode !== 'reset' && <p className="customer-portal__switch">{mode === 'signup' ? copy.signedUp : copy.needAccount} <button type="button" onClick={() => formMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? t('login.submit') : copy.signup}</button></p>}
   </form>}
  </div></section>
 </main>
}
