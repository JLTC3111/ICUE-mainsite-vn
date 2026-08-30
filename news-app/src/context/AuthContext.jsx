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

  const fetchProfile = useCallback(async (user, client) => {
    if (!user) return null

    const { data } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (data) return data

    // Self-heal: accounts created before the handle_new_user trigger existed
    // have no profile row, which breaks the articles.author_id foreign key.
    // Create one on the fly (allowed by the profiles_insert_self RLS policy).
    const meta = user.user_metadata || {}
    const email = user.email || ''
    const { data: created } = await client
      .from('profiles')
      .insert({
        id: user.id,
        full_name: meta.full_name || email,
        display_name: meta.display_name || email.split('@')[0] || 'Author',
        avatar_url: meta.avatar_url || null,
      })
      .select('*')
      .single()
    return created ?? null
  }, [])

  const applyAuthSession = useCallback(async (nextSession, client) => {
    if (!mountedRef.current) return

    const requestId = profileRequestRef.current + 1
    profileRequestRef.current = requestId
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
      if (mountedRef.current && profileRequestRef.current === requestId) {
        setProfile(null)
      }
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

  useEffect(() => {
    mountedRef.current = true

    if (shouldRestoreSession) {
      connectAuthClient().catch(() => {
        if (mountedRef.current) setLoading(false)
      })
    }

    return () => {
      mountedRef.current = false
      profileRequestRef.current += 1
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    }
  }, [connectAuthClient, shouldRestoreSession])

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
    setProfile(await fetchProfile(session?.user, client))
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
