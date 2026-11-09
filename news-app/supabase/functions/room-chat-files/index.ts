import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import * as magick from 'npm:@imagemagick/magick-wasm@0.0.46'
import { createRoomFilesHandler } from './handler.mjs'
import { createMagickImageSanitizer } from './imageSanitizer.mjs'

await magick.initializeImageMagick(await Deno.readFile(new URL(import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.46/magick.wasm'))))
const url = Deno.env.get('SUPABASE_URL')!
const key = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
Deno.serve(createRoomFilesHandler({
 admin,
 userClient: (request: Request) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: request.headers.get('authorization') || '' } } }),
 sanitizeImage: createMagickImageSanitizer(magick),
 // Edge has no full video transcoder. MP4 fails closed here. The same handler's
 // native server adapter injects a full FFmpeg decode/reencode implementation.
}))
