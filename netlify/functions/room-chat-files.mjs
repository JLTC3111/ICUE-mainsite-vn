import { createClient } from '@supabase/supabase-js'
import { createRoomFilesHandler, readBounded } from '../../news-app/supabase/functions/room-chat-files/handler.mjs'
import { sanitizeRoomMedia, ROOM_MEDIA_LIMIT } from './lib/room-media.mjs'

let handler
export default async function roomFiles(request) {
  if (!handler) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key || !service) return Response.json({ error: 'File service unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    const auth = { persistSession: false, autoRefreshToken: false }
    handler = createRoomFilesHandler({
      admin: createClient(url, service, { auth }),
      userClient: req => createClient(url, key, { auth, global: { headers: { Authorization: req.headers.get('authorization') || '' } } }),
      sanitizeImage: sanitizeRoomMedia,
      sanitizeVideo: sanitizeRoomMedia,
    })
  }
  // Buffered Netlify binary requests have a lower platform limit than Storage.
  // Enforce a portable 4 MiB file limit plus bounded multipart metadata.
  if (request.method === 'POST' && request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    try {
      const bytes = await readBounded(request, ROOM_MEDIA_LIMIT + 32 * 1024)
      request = new Request(request.url, { method: 'POST', headers: request.headers, body: bytes })
    } catch (error) {
      return Response.json({ error: error.status === 413 ? 'Files must be 4 MB or smaller.' : 'The upload is incomplete.' }, { status: error.status || 400, headers: { 'Cache-Control': 'no-store' } })
    }
  }
  return handler(request)
}
