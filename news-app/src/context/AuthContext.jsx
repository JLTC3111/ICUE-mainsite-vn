import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (data) {
      setProfile(data)
      return
    }

    // Self-heal: accounts created before the handle_new_user trigger existed
    // have no profile row, which breaks the articles.author_id foreign key.
    // Create one on the fly (allowed by the profiles_insert_self RLS policy).
    const meta = user.user_metadata || {}
    const email = user.email || ''
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: meta.full_name || email,
        display_name: meta.display_name || email.split('@')[0] || 'Author',
        avatar_url: meta.avatar_url || null,
      })
      .select('*')
      .single()
    setProfile(created ?? null)
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      loadProfile(data.session?.user).finally(() => active && setLoading(false))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(
    (email, password) => supabase.auth.signInWithPassword({ email, password }),
    [],
  )
  const signOut = useCallback(() => supabase.auth.signOut(), [])
  const refreshProfile = useCallback(
    () => loadProfile(session?.user),
    [loadProfile, session],
  )

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
