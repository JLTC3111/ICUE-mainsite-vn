import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outPath = path.join(root, 'netlify/functions/private-env.cjs')

const payload = {
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || '',
  GEMINI_API_KEY:
    process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GEMINI_API_KEY
    || process.env.GOOGLE_AI_API_KEY
    || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || '',
  CLOUDFLARE_ACCOUNT_ID:
    process.env.CLOUDFLARE_ACCOUNT_ID
    || process.env.CF_ACCOUNT_ID
    || '',
  CLOUDFLARE_API_TOKEN:
    process.env.CLOUDFLARE_API_TOKEN
    || process.env.CF_API_TOKEN
    || process.env.CLOUDFLARE_AI_API_TOKEN
    || '',
  CLOUDFLARE_FLUX_MODEL:
    process.env.CLOUDFLARE_FLUX_MODEL
    || process.env.CF_FLUX_MODEL
    || '',
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(
  outPath,
  `// Generated during Netlify build — do not commit.\nmodule.exports = ${JSON.stringify(payload, null, 2)}\n`,
)

// These keys are expected to be absent on a local build — they only exist in
// Netlify's environment. Warn on real deploys (where a missing key silently
// disables a feature in production) and stay quiet locally.
const isDeploy = process.env.NETLIFY === 'true' || process.env.CI === 'true'

if (isDeploy) {
  if (!payload.GEMINI_API_KEY) {
    console.warn(
      '[write-function-secrets] GEMINI_API_KEY missing at build time. '
        + 'Set it in Netlify env (Functions + Builds scopes) to enable /newsroom/assist.',
    )
  }
  if (!payload.CLOUDFLARE_ACCOUNT_ID || !payload.CLOUDFLARE_API_TOKEN) {
    console.warn(
      '[write-function-secrets] CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN missing at build time. '
        + 'Set both in Netlify env (Functions + Builds scopes) to enable Generate Image (FLUX).',
    )
  }
}
