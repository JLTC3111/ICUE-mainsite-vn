import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outPath = path.join(root, 'netlify/functions/private-env.cjs')

const payload = {
  GOOGLE_TRANSLATE_API_KEY:
    process.env.GOOGLE_TRANSLATE_API_KEY
    || process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY
    || '',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || '',
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(
  outPath,
  `// Generated during Netlify build — do not commit.\nmodule.exports = ${JSON.stringify(payload, null, 2)}\n`,
)

if (payload.GOOGLE_TRANSLATE_API_KEY) {
  console.log('[write-function-secrets] Google Translate key captured for Netlify functions.')
} else {
  console.warn(
    '[write-function-secrets] GOOGLE_TRANSLATE_API_KEY missing at build time. '
      + 'Set it in Netlify env (Functions + Builds scopes) and redeploy.',
  )
}

if (payload.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('[write-function-secrets] Supabase service role captured for Netlify functions.')
}
