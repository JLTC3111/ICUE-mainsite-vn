import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import { createSupportFilesHandler } from './handler.mjs'
const url = Deno.env.get('SUPABASE_URL')!
const key = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const handler = createSupportFilesHandler({
 admin,
 userClient: (request: Request) => createClient(url,key,{ auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:request.headers.get('authorization') || `Bearer ${key}`}} }),
})
// The handler authorizes each request using the visitor capability or the
// verified account JWT through checked RPCs; cleanup uses a Vault secret.
Deno.serve(handler)
