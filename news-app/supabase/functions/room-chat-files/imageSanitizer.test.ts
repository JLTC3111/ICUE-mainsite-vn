import assert from 'node:assert/strict'
import * as magick from 'npm:@imagemagick/magick-wasm@0.0.46'
import { createMagickImageSanitizer } from './imageSanitizer.mjs'

await magick.initializeImageMagick(await Deno.readFile(new URL(import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.46/magick.wasm'))))
// Construct the oversize fixture before installing the runtime memory limits.
const large = magick.ImageMagick.read(magick.MagickColors.Red, 3000, 3000, image => image.write(magick.MagickFormat.Png, bytes => new Uint8Array(bytes)))
const sanitize = createMagickImageSanitizer(magick)

for (const [format, mime] of [[magick.MagickFormat.Png, 'image/png'], [magick.MagickFormat.Jpeg, 'image/jpeg'], [magick.MagickFormat.WebP, 'image/webp']] as const) {
 Deno.test(`${mime}: actual decode strips metadata, rejects corruption and produces stable retry bytes`, async () => {
  const input = magick.ImageMagick.read(magick.MagickColors.Red, 12, 12, image => {
   image.comment = 'PRIVATE GPS AND COMMENT'
   image.setAttribute('Artist', 'private')
   return image.write(format, bytes => new Uint8Array(bytes))
  })
  const result = await sanitize(input, mime)
  assert.equal(result.mime, mime)
  magick.ImageMagick.read(result.bytes, image => {
   assert.equal(image.width, 12); assert.equal(image.height, 12)
   assert.equal(image.comment, null); assert.equal(image.getAttribute('Artist'), null)
  })
  assert.deepEqual((await sanitize(input, mime)).bytes, result.bytes)
  await assert.rejects(sanitize(input.subarray(0, Math.floor(input.length / 2)), mime))
  const damaged = new Uint8Array(input)
  damaged.fill(0, 16, damaged.length - 2)
  await assert.rejects(sanitize(damaged, mime))
 })
}
Deno.test('actual decoder rejects an image exceeding the pixel limit', async () => {
 await assert.rejects(sanitize(large, 'image/png'), /8 million pixels/)
})
