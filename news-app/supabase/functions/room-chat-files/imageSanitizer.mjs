import { IMAGE_LIMIT, IMAGE_PIXELS, mediaIssue } from './handler.mjs'

export function inspectStillImage(bytes, mime) {
 if (mime !== 'image/png' && mime !== 'image/webp') return
 const webp = mime === 'image/webp'
 const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
 let sawEnd = false
 for (let offset = webp ? 12 : 8; offset < bytes.length;) {
  if (offset + 8 > bytes.length) throw mediaIssue('This image is incomplete or corrupt.')
  const length = view.getUint32(offset + (webp ? 4 : 0), webp)
  const tagOffset = offset + (webp ? 0 : 4)
  const kind = String.fromCharCode(...bytes.subarray(tagOffset, tagOffset + 4))
  if (!webp && kind === 'IEND') sawEnd = true
  if (['acTL', 'ANIM', 'ANMF'].includes(kind)) throw mediaIssue('Animated image uploads are unsupported. Use a chat sticker or MP4 video instead.', 415)
  if (webp && kind === 'VP8X' && length >= 1 && (bytes[offset + 8] & 2)) throw mediaIssue('Animated image uploads are unsupported. Use a chat sticker or MP4 video instead.', 415)
  offset += webp ? length + 8 + (length % 2) : length + 12
  if (offset > bytes.length || (!webp && kind === 'IEND' && (length !== 0 || offset !== bytes.length))) throw mediaIssue('This image is incomplete or corrupt.')
 }
 if (!webp && !sawEnd) throw mediaIssue('This image is incomplete or corrupt.')
}

// The adapter receives the pinned ImageMagick WASM module so the same actual
// decoder can be exercised in Deno and Node without browser-native libraries.
export function createMagickImageSanitizer({ MagickImage, MagickImageInfo, MagickReadSettings, MagickFormat, ResourceLimits }) {
 ResourceLimits.width = 8192n
 ResourceLimits.height = 8192n
 ResourceLimits.area = BigInt(IMAGE_PIXELS)
 ResourceLimits.memory = 96n * 1024n * 1024n
 ResourceLimits.disk = 0n
 // ImageMagick creates temporary image entries even for a single PNG.
 ResourceLimits.listLength = 4n
 ResourceLimits.maxMemoryRequest = 64n * 1024n * 1024n
 ResourceLimits.maxProfileSize = 1024n * 1024n
 ResourceLimits.time = 8n
 const formats = { 'image/png': MagickFormat.Png, 'image/jpeg': MagickFormat.Jpeg, 'image/webp': MagickFormat.WebP }
 return async (bytes, mime) => {
  const format = formats[mime]
  if (!format) throw mediaIssue('Unsupported image format.', 415)
  // Keep uploads still images; animation is the controlled SVG sticker set.
  // Reject animation chunks before handing an image to the full decoder.
  inspectStillImage(bytes, mime)
  const settings = new MagickReadSettings({ format })
  const info = MagickImageInfo.create(bytes, settings)
  if (!info.width || !info.height || info.width > 8192 || info.height > 8192 || info.width * info.height > IMAGE_PIXELS) throw mediaIssue('Images must contain at most 8 million pixels and be no larger than 8192 pixels on either side.')
  const image = MagickImage.create()
  let warning = false
  image.onWarning = () => { warning = true }
  try {
   // A complete decode is required. ImageMagick warnings include damaged and
   // truncated streams; recoverable decoder warnings are rejected as well.
   image.read(bytes, settings)
   if (warning) throw mediaIssue('This image is incomplete or corrupt.')
   image.autoOrient()
   image.strip()
   image.depth = 8
   image.quality = 90
   image.settings.setDefine(MagickFormat.Png, 'exclude-chunk', 'date,time')
   const encoded = image.write(format, output => new Uint8Array(output))
   if (warning || !encoded.length || encoded.length > IMAGE_LIMIT) throw mediaIssue('This image could not be safely processed within the file limit.')
   return { bytes: encoded, mime }
  } finally { image.dispose() }
 }
}
