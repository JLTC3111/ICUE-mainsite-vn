import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import ffmpeg from 'ffmpeg-static'
import ffprobe from '@ffprobe-installer/ffprobe'
import { sanitizeRoomMedia, ROOM_MEDIA_LIMIT } from '../../netlify/functions/lib/room-media.mjs'
import { createRoomFilesHandler } from '../../news-app/supabase/functions/room-chat-files/handler.mjs'

const exec = promisify(execFile), secret = 'PRIVATE_LOCATION_AND_COMMENT'
const media = new Map()
let directory
const crc32 = bytes => {
 let crc = 0xffffffff
 for (const byte of bytes) {
  crc ^= byte
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
 }
 return (crc ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
 const chunk = Buffer.alloc(data.length + 12)
 chunk.writeUInt32BE(data.length); chunk.write(type, 4); Buffer.from(data).copy(chunk, 8)
 chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4)
 return chunk
}
function webpChunk(type, data) {
 const chunk = Buffer.alloc(data.length + 8 + data.length % 2)
 chunk.write(type); chunk.writeUInt32LE(data.length, 4); Buffer.from(data).copy(chunk, 8)
 return chunk
}
async function generate(name, codec, extra = []) {
 const output = join(directory, name)
 await exec(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=32x24:r=10', ...extra, '-c:v', codec, '-threads', '1', output], { timeout: 10_000, maxBuffer: 64 * 1024 })
 return new Uint8Array(await readFile(output))
}
before(async () => {
 directory = await mkdtemp(join(tmpdir(), 'icue-room-native-test-'))
 let png = Buffer.from(await generate('image.png', 'png', ['-frames:v', '1']))
 png = Buffer.concat([png.subarray(0, 33), pngChunk('tEXt', Buffer.from(`Comment\0${secret}`)), png.subarray(33)])
 media.set('image/png', png)
 let jpeg = Buffer.from(await generate('image.jpg', 'mjpeg', ['-frames:v', '1']))
 const comment = Buffer.from(secret), marker = Buffer.alloc(comment.length + 4)
 marker[0] = 255; marker[1] = 254; marker.writeUInt16BE(comment.length + 2, 2); comment.copy(marker, 4)
 jpeg = Buffer.concat([jpeg.subarray(0, 2), marker, jpeg.subarray(2)])
 media.set('image/jpeg', jpeg)
 const webp = Buffer.from(await generate('image.webp', 'libwebp', ['-frames:v', '1']))
 const extended = Buffer.alloc(10); extended[0] = 4; extended[4] = 31; extended[7] = 23
 const webpWithMetadata = Buffer.concat([webp.subarray(0, 12), webpChunk('VP8X', extended), webp.subarray(12), webpChunk('XMP ', Buffer.from(`<x:xmpmeta>${secret}</x:xmpmeta>`))])
 webpWithMetadata.writeUInt32LE(webpWithMetadata.length - 8, 4)
 media.set('image/webp', webpWithMetadata)
 media.set('video/mp4', await generate('video.mp4', 'libx264', ['-t', '0.6', '-pix_fmt', 'yuv420p', '-metadata', `title=${secret}`, '-metadata', 'location=+10.00+106.00/', '-movflags', '+faststart']))
})
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }) })

test('native PNG, JPEG, WebP and MP4 are fully decoded and rewritten with metadata removed', async () => {
 for (const [mime, bytes] of media) {
  assert.ok(Buffer.from(bytes).includes(Buffer.from(secret)), `${mime} fixture contains metadata`)
  const result = await sanitizeRoomMedia(bytes, mime).catch(error => { error.message = `${mime}: ${error.message}`; throw error })
  assert.equal(result.mime, mime)
  assert.ok(result.bytes.length > 0 && result.bytes.length <= ROOM_MEDIA_LIMIT)
  assert.ok(!Buffer.from(result.bytes).includes(Buffer.from(secret)), `${mime} strips original metadata`)
  const output = join(directory, `verify-${mime.split('/')[1]}`)
  await writeFile(output, result.bytes)
  await exec(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-err_detect', 'explode', '-xerror', '-i', output, '-f', 'null', '-'], { timeout: 10_000, maxBuffer: 64 * 1024 })
  const { stdout } = await exec(ffprobe.path, ['-v', 'error', '-show_entries', 'format_tags:stream=codec_name,width,height', '-of', 'json', output])
  const info = JSON.parse(stdout)
  assert.equal(info.streams[0].width, 32); assert.equal(info.streams[0].height, 24)
  assert.ok(!stdout.includes(secret))
 }
})

test('native sanitizer rejects incomplete and corrupt images and video before returning a file', async () => {
 for (const [mime, bytes] of media) {
  const incomplete = bytes.subarray(0, Math.floor(bytes.length / 2))
  await assert.rejects(sanitizeRoomMedia(incomplete, mime), error => [400, 413, 415].includes(error.status), `${mime} truncation`)
 }
 const png = Buffer.from(media.get('image/png'))
 png.fill(0, 40, png.length - 12)
 await assert.rejects(sanitizeRoomMedia(png, 'image/png'))
 const jpeg = Buffer.from(media.get('image/jpeg'))
 jpeg.fill(0, 40, jpeg.length - 2)
 await assert.rejects(sanitizeRoomMedia(jpeg, 'image/jpeg'))
 const video = media.get('video/mp4')
 await assert.rejects(sanitizeRoomMedia(video.subarray(0, video.length - 100), 'video/mp4'), /corrupt|complete|incompatible/)
})

test('MP4 with AAC audio is fully decoded and rewritten with both media tracks', async () => {
 const input = await generate('with-audio.mp4', 'libx264', ['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-map', '0:v:0', '-map', '1:a:0', '-t', '0.6', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart'])
 const result = await sanitizeRoomMedia(input, 'video/mp4'), output = join(directory, 'audio-clean.mp4')
 await writeFile(output, result.bytes)
 const { stdout } = await exec(ffprobe.path, ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'json', output])
 assert.deepEqual(JSON.parse(stdout).streams.map(stream => stream.codec_name), ['h264', 'aac'])
})

test('native sanitizer rejects animated still formats, wrong codecs, oversize files and clips over 30 seconds', async () => {
 const png = Buffer.from(media.get('image/png')), animation = Buffer.alloc(8)
 animation.writeUInt32BE(2)
 await assert.rejects(sanitizeRoomMedia(Buffer.concat([png.subarray(0, 33), pngChunk('acTL', animation), png.subarray(33)]), 'image/png'), /Animated/)
 const webp = Buffer.from(media.get('image/webp')); webp[20] |= 2
 await assert.rejects(sanitizeRoomMedia(webp, 'image/webp'), /Animated/)
 await assert.rejects(sanitizeRoomMedia(new Uint8Array(ROOM_MEDIA_LIMIT + 1), 'image/png'), error => error.status === 413)
 const incompatible = await generate('unsupported.mp4', 'mpeg4', ['-t', '0.5', '-movflags', '+faststart'])
 await assert.rejects(sanitizeRoomMedia(incompatible, 'video/mp4'), /H\.264/)
 const long = await generate('long.mp4', 'libx264', ['-t', '31', '-r', '1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'])
 await assert.rejects(sanitizeRoomMedia(long, 'video/mp4'), /30 seconds/)
})

test('native adapter pipeline reserves and stores only decoded rewritten bytes', async () => {
 const room = '00000000-0000-4000-8000-000000009201', id = '00000000-0000-4000-8000-000000009202'
 let reserved, stored, authorized = false
 const user = { rpc: async (name, args) => {
  if (name.endsWith('file_authorize')) { authorized = true; return { data: { room_id: room } } }
  assert.ok(authorized)
  reserved = { id, path: `${room}/${id}.png`, ...args }
  return { data: { ...reserved, status: 'reserved' } }
 } }
 const admin = { rpc: async () => ({ data: { id, name: 'image.png', mime: 'image/png', size: stored.length } }), storage: { from: () => ({ upload: async (_path, bytes) => { stored = bytes; return { data: {} } } }) } }
 const handler = createRoomFilesHandler({ userClient: () => user, admin, sanitizeImage: sanitizeRoomMedia, sanitizeVideo: sanitizeRoomMedia })
 const form = new FormData(); form.append('file', new File([media.get('image/png')], 'image.png', { type: 'image/png' })); form.append('room_id', room); form.append('client_id', id)
 const response = await handler(new Request('https://example.invalid', { method: 'POST', headers: { Authorization: 'Bearer confirmed-member' }, body: form }))
 assert.equal(response.status, 200)
 assert.ok(!Buffer.from(stored).includes(Buffer.from(secret)))
 assert.equal(reserved.p_size, stored.length)
 assert.equal(reserved.p_sha256, createHash('sha256').update(stored).digest('hex'))
})
