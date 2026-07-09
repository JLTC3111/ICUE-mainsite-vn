/** Rasterize circular text to a PNG data URL for MetallicPaint input. */
export function renderCircularTextImage(text, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  const letters = Array.from(text)
  const fontSize = Math.max(14, Math.floor((size / letters.length) * 2.4))
  ctx.fillStyle = '#000000'
  ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.34

  letters.forEach((letter, i) => {
    const angle = (i / letters.length) * Math.PI * 2 - Math.PI / 2
    ctx.save()
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
    ctx.rotate(angle + Math.PI / 2)
    ctx.fillText(letter, 0, 0)
    ctx.restore()
  })

  return canvas.toDataURL('image/png')
}
