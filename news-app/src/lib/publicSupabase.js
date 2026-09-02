import { loadSupabaseConfig } from './supabaseConfig'
import { buildPostgrestUrl } from './postgrestRequest'

function unavailableError() {
  return {
    code: 'SUPABASE_NOT_CONFIGURED',
    message: 'Supabase is not configured.',
  }
}

/**
 * Lightweight PostgREST reader for anonymous newsroom pages.
 *
 * Public pages only need table reads, so loading the full Supabase auth,
 * realtime, functions and storage SDK on the critical path is unnecessary.
 * RLS remains authoritative: requests still use the project's anon key.
 */
export async function publicSelect(table, query) {
  const config = await loadSupabaseConfig()
  if (!config) return { data: null, error: unavailableError() }

  const url = buildPostgrestUrl(config.url, table, query)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        data: null,
        error: {
          ...(payload && typeof payload === 'object' ? payload : {}),
          status: response.status,
          message: payload?.message || `Supabase request failed (${response.status}).`,
        },
      }
    }

    return { data: payload, error: null }
  } catch (error) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
