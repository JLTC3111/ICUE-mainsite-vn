const issue = (status, code, message) => Object.assign(new Error(message), { status, code })

/** Authenticate the token, then authorize its current database-owned role.
 * Auth's `authenticated` role and editable user metadata do not grant Studio access. */
export async function requireNewsroomEditor(accessToken, env, signal) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !anonKey) throw issue(500, 'auth_not_configured', 'Authentication is not configured.')
  if (!accessToken) throw issue(401, 'unauthorized', 'Sign in to continue.')
  const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
  const response = await fetch(`${url}/auth/v1/user`, { signal, headers })
  if (!response.ok) throw issue(401, 'unauthorized', 'Sign in to continue.')
  const user = await response.json()
  if (!user?.id || typeof user.id !== 'string') throw issue(401, 'unauthorized', 'Sign in to continue.')

  signal.throwIfAborted()
  const endpoint = new URL(`${url}/rest/v1/profiles`)
  endpoint.searchParams.set('id', `eq.${user.id}`)
  endpoint.searchParams.set('select', 'id,role')
  endpoint.searchParams.set('limit', '1')
  const roles = await fetch(endpoint.toString(), { signal, headers })
  if (roles.status === 401) throw issue(401, 'unauthorized', 'Sign in to continue.')
  if (!roles.ok) throw issue(503, 'authorization_unavailable', 'Staff access could not be verified. Please retry.')
  const profiles = await roles.json()
  if (!Array.isArray(profiles)) throw issue(503, 'authorization_unavailable', 'Staff access could not be verified. Please retry.')
  if (profiles.length !== 1 || profiles[0]?.id !== user.id || !['author', 'admin'].includes(profiles[0]?.role)) {
    throw issue(403, 'forbidden', 'Newsroom staff access required.')
  }
  return user
}
