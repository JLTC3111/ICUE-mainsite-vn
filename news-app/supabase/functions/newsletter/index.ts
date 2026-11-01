import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import nodemailer from 'npm:nodemailer@10.1.7'
import { createNewsletterHandler } from './handler.mjs'

const env = (name: string) => Deno.env.get(name)
// Reuse the site's configured sender, with optional newsletter-specific settings.
const smtp = (name: string) => env(`NEWSLETTER_SMTP_${name}`) || env(`FEEDBACK_SMTP_${name}`)
const port = Number(smtp('PORT') || 465)
const transport = nodemailer.createTransport({
  host: smtp('HOST'), port, secure: port === 465, requireTLS: port !== 465,
  auth: { user: smtp('USER'), pass: smtp('PASSWORD') },
  connectionTimeout: 7000, greetingTimeout: 7000, socketTimeout: 10000,
  disableFileAccess: true, disableUrlAccess: true,
})
const url = env('SUPABASE_URL')!
const key = env('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
// Public subscriptions require double opt-in. Capability tokens authorize
// confirmation/unsubscribe; the scheduler uses a separate Vault credential.
Deno.serve(createNewsletterHandler({
  admin,
  ipSalt: key,
  siteUrl: env('NEWSLETTER_SITE_URL') || 'https://vi.icue.vn',
  functionUrl: `${url}/functions/v1/newsletter`,
  verifyEmail: async () => {
    if (!smtp('HOST') || !smtp('USER') || !smtp('PASSWORD') || !smtp('FROM')) throw new Error('SMTP unavailable')
    await transport.verify()
  },
  sendEmail: async (message: Record<string, unknown>) => {
    if (!smtp('HOST') || !smtp('USER') || !smtp('PASSWORD') || !smtp('FROM')) throw new Error('SMTP unavailable')
    const result = await transport.sendMail({ ...message, from: smtp('FROM') })
    if (!result.accepted?.length || result.rejected?.length) throw new Error('SMTP rejected message')
  },
}))
