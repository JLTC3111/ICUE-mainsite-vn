let clientPromise = null

/** Load and configure the full Supabase browser SDK only when a route needs it. */
export function loadSupabaseClient() {
  if (!clientPromise) {
    clientPromise = import('./supabase').then(async (module) => {
      await module.initSupabase()
      return module.supabase
    })
  }
  return clientPromise
}

/**
 * Supabase's default browser storage key is `sb-<project-ref>-auth-token`.
 * Anonymous grid readers have no such key, so they can skip the auth SDK.
 */
export function mayHaveSupabaseSession() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) return true
    }
  } catch {
    // Private modes can deny storage access; auth routes still load explicitly.
  }

  const authPayload = `${window.location.search}${window.location.hash}`
  return /(?:access_token|refresh_token|type=recovery|(?:^|[?&#])code=)/.test(authPayload)
}
