import { usePageResume } from '../../../shared/resilience/usePageResume.js'
import { withDeadline } from '../../../shared/resilience/requests.js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { loadSupabaseClient, mayHaveSupabaseSession } from '../lib/supabaseLoader'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [shouldRestoreSession] = useState(() => mayHaveSupabaseSession())
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(shouldRestoreSession)
  const mountedRef = useRef(true)
  const subscriptionRef = useRef(null)
  const profileRequestRef = useRef(0)
  const currentUserRef = useRef(null)
  const profilePendingRef = useRef(new Map())

  const fetchProfile = useCallback((user, client) => {
    if (!user) return Promise.resolve(null)
    const pending = profilePendingRef.current
    if (pending.has(user.id)) return pending.get(user.id)
    const request = (async () => {
      const read = () => client.from('profiles').select('*').eq('id', user.id).maybeSingle()
      const { data, error } = await read()
      if (error) throw error
      if (data) return data
      const meta = user.user_metadata || {}
      const email = user.email || ''
      const { data: created, error: insertError } = await client.from('profiles').insert({
        id: user.id,
        full_name: meta.full_name || email,
        display_name: meta.display_name || email.split('@')[0] || 'Author',
        avatar_url: meta.avatar_url || null,
      }).select('*').single()
      // A second tab may create the same profile concurrently.
      if (insertError?.code === '23505') {
        const result = await read()
        if (result.error) throw result.error
        return result.data
      }
      if (insertError) throw insertError
      return created ?? null
    })()
    pending.set(user.id, request)
    request.finally(() => { if (pending.get(user.id) === request) pending.delete(user.id) }).catch(() => {})
    return request
  }, [])

  const applyAuthSession = useCallback(async (nextSession, client) => {
    if (!mountedRef.current) return

    const requestId = profileRequestRef.current + 1
    profileRequestRef.current = requestId
    const userId = nextSession?.user?.id ?? null
    if (currentUserRef.current !== userId) setProfile(null)
    currentUserRef.current = userId
    setSession(nextSession)

    if (!nextSession?.user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      const nextProfile = await fetchProfile(nextSession.user, client)
      if (!mountedRef.current || profileRequestRef.current !== requestId) return
      setProfile(nextProfile)
    } catch {
      // Keep the known profile when a background read loses connectivity.
    } finally {
      if (mountedRef.current && profileRequestRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [fetchProfile])

  const connectAuthClient = useCallback(async () => {
    const client = await loadSupabaseClient()
    if (!mountedRef.current || subscriptionRef.current) return client

    // Keep the listener synchronous as recommended by Supabase. Profile work is
    // deliberately started without returning its promise to the auth emitter.
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mountedRef.current) void applyAuthSession(nextSession, client)
    })
    subscriptionRef.current = data.subscription
    return client
  }, [applyAuthSession])

  const restoreSession = useCallback(async () => {
    if (!shouldRestoreSession && !currentUserRef.current && !mayHaveSupabaseSession()) return
    const requestId = profileRequestRef.current
    try {
      const client = await connectAuthClient()
      const { data, error } = await withDeadline(() => client.auth.getSession())
      if (error) throw error
      if (mountedRef.current && profileRequestRef.current === requestId) {
        await applyAuthSession(data?.session ?? null, client)
      }
    } catch {
      if (mountedRef.current) setLoading(false)
    }
  }, [applyAuthSession, connectAuthClient, shouldRestoreSession])
  usePageResume(restoreSession, { minHiddenMs: 0 })

  useEffect(() => {
    mountedRef.current = true

    if (shouldRestoreSession) {
      // State updates in restoreSession follow the awaited client/session reads.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void restoreSession()
    }

    return () => {
      mountedRef.current = false
      profileRequestRef.current += 1
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    }
  }, [restoreSession, shouldRestoreSession])

  const signIn = useCallback(async (email, password) => {
    setLoading(true)
    try {
      // First-time visitors do not load Supabase on the public grid. Connecting
      // here installs the long-lived listener before their first sign-in event.
      const client = await connectAuthClient()
      const result = await client.auth.signInWithPassword({ email, password })
      const nextSession = result.data?.session ?? null
      if (!result.error && nextSession) {
        await applyAuthSession(nextSession, client)
      } else if (mountedRef.current) {
        setLoading(false)
      }
      return result
    } catch (error) {
      if (mountedRef.current) setLoading(false)
      throw error
    }
  }, [applyAuthSession, connectAuthClient])

  const signOut = useCallback(async () => {
    const client = await connectAuthClient()
    const result = await client.auth.signOut()
    if (!result.error) {
      await applyAuthSession(null, client)
    }
    return result
  }, [applyAuthSession, connectAuthClient])

  const refreshProfile = useCallback(async () => {
    const client = await connectAuthClient()
    const nextProfile = await fetchProfile(session?.user, client)
    if (mountedRef.current && currentUserRef.current === session?.user?.id) setProfile(nextProfile)
  }, [connectAuthClient, fetchProfile, session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAuthed: !!session,
      isAdmin: profile?.role === 'admin',
      loading,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
