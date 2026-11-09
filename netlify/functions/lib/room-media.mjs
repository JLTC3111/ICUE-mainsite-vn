import { execFile } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import ffmpeg from 'ffmpeg-static'
import ffprobe from '@ffprobe-installer/ffprobe'
import { inspectMedia } from '../../../news-app/supabase/functions/room-chat-files/handler.mjs'
import { inspectStillImage } from '../../../news-app/supabase/functions/room-chat-files/imageSanitizer.mjs'

export const ROOM_MEDIA_LIMIT = 4 * 1024 * 1024
const exec = promisify(execFile)
const fail = (message, status = 415) => Object.assign(new Error(message), { status })
let active = 0

/** Decode and rewrite local bytes, without accepting URLs or shell commands. */
export async function sanitizeRoomMedia(bytes, mime) {
  if (active >= 2) throw fail('Media processing is busy. Please retry.', 429)
  if (!bytes.length || bytes.length > ROOM_MEDIA_LIMIT) throw fail('Files must be 4 MB or smaller.', 413)
  if (!['video/mp4', 'image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw fail('Unsupported media format.')
  const extension = { 'video/mp4': 'mp4', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[mime]
  const isVideo = mime === 'video/mp4'
  const demuxerOptions = isVideo ? ['-f', 'mov', '-enable_drefs', '0', '-use_absolute_path', '0'] : []
  inspectMedia(bytes, `input.${extension}`, mime)
  inspectStillImage(bytes, mime)
  active++
  const deadline = AbortSignal.timeout(45_000)
  let directory
  try {
    directory = await mkdtemp(join(tmpdir(), 'icue-room-media-'))
    const input = join(directory, 'input')
    const output = join(directory, `clean.${extension}`)
    await writeFile(input, bytes, { mode: 0o600 })
    const probe = async path => {
      const { stdout } = await exec(ffprobe.path, ['-v', 'error', '-max_alloc', '67108864', '-protocol_whitelist', 'file,pipe', ...demuxerOptions, '-show_entries', 'format=duration,format_name:stream=codec_type,codec_name,width,height,duration,avg_frame_rate', '-of', 'json', path], { signal: deadline, timeout: 5000, maxBuffer: 64 * 1024, windowsHide: true })
      return JSON.parse(stdout)
    }
    const source = await probe(input), streams = source.streams || [], video = streams.filter(s => s.codec_type === 'video'), audio = streams.filter(s => s.codec_type === 'audio')
    if (video.length !== 1 || streams.length !== video.length + audio.length || audio.length > 1) throw fail('This media contains incompatible tracks.')
    const image = video[0], duration = Number(source.format?.duration), fpsParts = String(image.avg_frame_rate).split('/').map(Number), fps = fpsParts[0] / fpsParts[1]
    if (!(image.width > 0 && image.height > 0) || image.width * image.height > 16_000_000 || image.width > 8192 || image.height > 8192) throw fail('Images and video frames must be 16 megapixels or smaller.')
    const codecs = { 'image/png': ['png'], 'image/jpeg': ['mjpeg'], 'image/webp': ['webp'], 'video/mp4': ['h264'] }
    if (!codecs[mime].includes(image.codec_name) || (isVideo && audio.some(s => s.codec_name !== 'aac')) || (!isVideo && audio.length)) throw fail('Use PNG, JPEG, WebP or MP4 with H.264 video and AAC audio.')
    if (isVideo && (!source.format?.format_name?.split(',').includes('mp4') || !Number.isFinite(duration) || duration <= 0 || duration > 30 || !Number.isFinite(fps) || fps <= 0 || fps > 60)) throw fail('MP4 clips must be 30 seconds or shorter, at up to 60 fps.')
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-max_alloc', '67108864', '-threads', '1', '-protocol_whitelist', 'file,pipe', '-err_detect', 'explode', '-xerror', ...demuxerOptions, '-i', input, '-map', '0:v:0']
    if (isVideo) args.push('-map', '0:a:0?', '-vf', "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-c:v', 'libx264', '-threads', '1', '-preset', 'veryfast', '-b:v', '650k', '-maxrate', '800k', '-bufsize', '1200k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart')
    else args.push('-frames:v', '1', '-c:v', { 'image/png': 'png', 'image/jpeg': 'mjpeg', 'image/webp': 'libwebp' }[mime], '-threads', '1')
    args.push('-map_metadata', '-1', '-map_chapters', '-1', '-fs', String(ROOM_MEDIA_LIMIT), output)
    await exec(ffmpeg, args, { signal: deadline, timeout: 25_000, maxBuffer: 64 * 1024, windowsHide: true })
    const clean = new Uint8Array(await readFile(output))
    if (!clean.length || clean.length > ROOM_MEDIA_LIMIT) throw fail('The sanitized file exceeds 4 MB.')
    inspectMedia(clean, `clean.${extension}`, mime)
    inspectStillImage(clean, mime)
    // ffprobe recognizes headers on truncated images and videos. Decode every
    // generated frame and audio packet before publishing the private object.
    await exec(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-max_alloc', '67108864', '-threads', '1', '-protocol_whitelist', 'file,pipe', '-err_detect', 'explode', '-xerror', ...demuxerOptions, '-i', output, '-map', '0:v:0', '-map', '0:a:0?', '-f', 'null', '-'], { signal: deadline, timeout: 25_000, maxBuffer: 64 * 1024, windowsHide: true })
    const result = await probe(output)
    // A size-limited encoder can otherwise exit successfully with a short clip.
    if (isVideo && Math.abs(Number(result.format?.duration) - duration) > 0.15) throw fail('The video could not be processed completely. Try a shorter clip.')
    return { bytes: clean, mime }
  } catch (error) {
    if (error.status) throw error
    throw Object.assign(fail('This file is corrupt, incomplete, incompatible, or too complex to process.'), { cause: error })
  } finally {
    try { if (directory) await rm(directory, { recursive: true, force: true }) }
    finally { active-- }
  }
}
