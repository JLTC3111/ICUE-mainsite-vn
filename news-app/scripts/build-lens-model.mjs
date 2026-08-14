/**
 * Bakes public/models/magnifying-glass.glb into the compact binary the Lens
 * component's WebGL cursor reads at runtime.
 *
 * The source GLB is 372 kB of float32 with a UV set no material samples (it has
 * no textures at all) and a 9-node hierarchy. None of that survives here: node
 * matrices are baked into the vertices, primitives are merged per material
 * (7 draw calls -> 3), UVs are dropped, positions become int16 and normals
 * int8. The result is ~181 kB and needs no glTF parser on the client, so the
 * lens chunk ships a hand-written renderer instead of three.js.
 *
 * The source GLB is not in git, so the generated .bin is committed and this
 * script no-ops when the source is absent or older than its output.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

const SRC = path.join(siteRoot, 'public/models/magnifying-glass.glb')
const OUT_DIR = path.join(appRoot, 'public/models')
const OUT = path.join(OUT_DIR, 'magnifying-glass.lens.bin')

/** Widest handle swing the renderer applies, in radians. Sizes the canvas. */
const MAX_SWING = 0.16
/** Padding on the baked bounds so specular/AA never clips at the canvas edge. */
const BOUNDS_MARGIN = 1.03
/** Radial samples of the lens half-profile the renderer lathes the glass from. */
const GLASS_PROFILE_SAMPLES = 8

const COMPONENT = {
  5120: { array: Int8Array, size: 1 },
  5121: { array: Uint8Array, size: 1 },
  5122: { array: Int16Array, size: 2 },
  5123: { array: Uint16Array, size: 2 },
  5125: { array: Uint32Array, size: 4 },
  5126: { array: Float32Array, size: 4 },
}

const TYPE_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

function parseGlb(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB file')
  let json = null
  let bin = null
  let offset = 12
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset)
    const type = buffer.readUInt32LE(offset + 4)
    const body = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8'))
    if (type === 0x004e4942) bin = body
    offset += 8 + length
  }
  if (!json) throw new Error('GLB has no JSON chunk')
  return { json, bin }
}

/** Reads an accessor into a plain array of numbers, honouring byteStride. */
function readAccessor(gltf, bin, index) {
  const accessor = gltf.accessors[index]
  const component = COMPONENT[accessor.componentType]
  const components = TYPE_COUNT[accessor.type]
  const out = new Float64Array(accessor.count * components)
  if (accessor.bufferView == null) return out

  const view = gltf.bufferViews[accessor.bufferView]
  const base = (view.byteOffset || 0) + (accessor.byteOffset || 0)
  const stride = view.byteStride || components * component.size
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)

  const readers = {
    5120: (o) => dv.getInt8(o),
    5121: (o) => dv.getUint8(o),
    5122: (o) => dv.getInt16(o, true),
    5123: (o) => dv.getUint16(o, true),
    5125: (o) => dv.getUint32(o, true),
    5126: (o) => dv.getFloat32(o, true),
  }
  const read = readers[accessor.componentType]

  for (let i = 0; i < accessor.count; i += 1) {
    for (let c = 0; c < components; c += 1) {
      out[i * components + c] = read(base + i * stride + c * component.size)
    }
  }
  return out
}

/* Column-major 4x4 math, matching glTF's matrix layout. */
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

function multiply(a, b) {
  const out = new Array(16)
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row] * b[col * 4 + k]
      out[col * 4 + row] = sum
    }
  }
  return out
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix
  const [tx, ty, tz] = node.translation || [0, 0, 0]
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale || [1, 1, 1]
  const x2 = x + x
  const y2 = y + y
  const z2 = z + z
  const xx = x * x2
  const xy = x * y2
  const xz = x * z2
  const yy = y * y2
  const yz = y * z2
  const zz = z * z2
  const wx = w * x2
  const wy = w * y2
  const wz = w * z2
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]
}

/** Inverse transpose of the upper-left 3x3, plus its determinant. */
function normalMatrix(m) {
  const a = m[0]
  const b = m[1]
  const c = m[2]
  const d = m[4]
  const e = m[5]
  const f = m[6]
  const g = m[8]
  const h = m[9]
  const i = m[10]
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e)
  if (Math.abs(det) < 1e-12) return { matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1], det: 1 }
  const inv = 1 / det
  // adjugate / det, then transposed -> rows of the cofactor matrix
  return {
    matrix: [
      (e * i - f * h) * inv, (f * g - d * i) * inv, (d * h - e * g) * inv,
      (c * h - b * i) * inv, (a * i - c * g) * inv, (b * g - a * h) * inv,
      (b * f - c * e) * inv, (c * d - a * f) * inv, (a * e - b * d) * inv,
    ],
    det,
  }
}

function collectPrimitives(gltf, bin) {
  const groups = new Map()

  const walk = (nodeIndex, parent) => {
    const node = gltf.nodes[nodeIndex]
    const world = multiply(parent, nodeMatrix(node))

    if (node.mesh != null) {
      const { matrix: nm, det } = normalMatrix(world)
      const flipWinding = det < 0

      for (const primitive of gltf.meshes[node.mesh].primitives) {
        if (primitive.mode != null && primitive.mode !== 4) continue
        const materialIndex = primitive.material ?? -1
        if (!groups.has(materialIndex)) {
          groups.set(materialIndex, { positions: [], normals: [], indices: [] })
        }
        const group = groups.get(materialIndex)
        const vertexBase = group.positions.length / 3

        const positions = readAccessor(gltf, bin, primitive.attributes.POSITION)
        const normals = primitive.attributes.NORMAL != null
          ? readAccessor(gltf, bin, primitive.attributes.NORMAL)
          : null
        const vertexCount = positions.length / 3

        for (let i = 0; i < vertexCount; i += 1) {
          const px = positions[i * 3]
          const py = positions[i * 3 + 1]
          const pz = positions[i * 3 + 2]
          group.positions.push(
            world[0] * px + world[4] * py + world[8] * pz + world[12],
            world[1] * px + world[5] * py + world[9] * pz + world[13],
            world[2] * px + world[6] * py + world[10] * pz + world[14],
          )

          const nx = normals ? normals[i * 3] : 0
          const ny = normals ? normals[i * 3 + 1] : 0
          const nz = normals ? normals[i * 3 + 2] : 1
          let wx = nm[0] * nx + nm[3] * ny + nm[6] * nz
          let wy = nm[1] * nx + nm[4] * ny + nm[7] * nz
          let wz = nm[2] * nx + nm[5] * ny + nm[8] * nz
          const len = Math.hypot(wx, wy, wz) || 1
          wx /= len
          wy /= len
          wz /= len
          group.normals.push(wx, wy, wz)
        }

        const indices = primitive.indices != null
          ? readAccessor(gltf, bin, primitive.indices)
          : Float64Array.from({ length: vertexCount }, (_, i) => i)

        for (let i = 0; i + 2 < indices.length; i += 3) {
          const a = vertexBase + indices[i]
          const b = vertexBase + indices[i + 1]
          const c = vertexBase + indices[i + 2]
          if (flipWinding) group.indices.push(a, c, b)
          else group.indices.push(a, b, c)
        }
      }
    }

    for (const child of node.children || []) walk(child, world)
  }

  const scene = gltf.scenes[gltf.scene ?? 0]
  for (const nodeIndex of scene.nodes) walk(nodeIndex, IDENTITY)
  return groups
}

/**
 * Screen-space footprint of the model once the renderer swings it about Z.
 * The renderer sizes its canvas from this, so a tight box means fewer pixels
 * cleared and shaded every frame.
 */
function sweptBounds(groups) {
  const angles = [-MAX_SWING, 0, MAX_SWING]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const group of groups.values()) {
    for (let i = 0; i < group.positions.length; i += 3) {
      const x = group.positions[i]
      const y = group.positions[i + 1]
      for (const angle of angles) {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rx = x * cos - y * sin
        const ry = x * sin + y * cos
        if (rx < minX) minX = rx
        if (rx > maxX) maxX = rx
        if (ry < minY) minY = ry
        if (ry > maxY) maxY = ry
      }
    }
  }

  return [minX * BOUNDS_MARGIN, minY * BOUNDS_MARGIN, maxX * BOUNDS_MARGIN, maxY * BOUNDS_MARGIN]
}

/** Outer radius of the glass disc — the renderer scales it to the lens size. */
function glassRadius(group) {
  let radius = 0
  for (let i = 0; i < group.positions.length; i += 3) {
    radius = Math.max(radius, Math.hypot(group.positions[i], group.positions[i + 1]))
  }
  return radius
}

/**
 * The lens is a surface of revolution, so its 7.6k triangles carry no more
 * information than a half-profile does. Sampling that profile lets the renderer
 * lathe the disc back at whatever tessellation the screen actually needs, and
 * keeps the mesh — 47% of the payload, for a near-flat surface drawn at ~19%
 * opacity — out of the file entirely.
 *
 * Returns z at `samples` evenly spaced radii from the centre out to the rim.
 */
function glassProfile(group, radius, samples) {
  // Bin by radius keeping the highest z: the top surface, ignoring the rim band
  // and the mirrored underside.
  const rings = new Map()
  for (let i = 0; i < group.positions.length; i += 3) {
    const r = Math.hypot(group.positions[i], group.positions[i + 1])
    const z = group.positions[i + 2]
    if (z < 0) continue
    const key = Math.round(r * 1e6)
    if (!rings.has(key) || z > rings.get(key)) rings.set(key, z)
  }

  const curve = [...rings.entries()]
    .map(([key, z]) => [key / 1e6, z])
    .sort((a, b) => a[0] - b[0])

  // Resample onto a uniform radial grid so the renderer needs no radius table.
  const profile = []
  let cursor = 0
  for (let s = 0; s < samples; s += 1) {
    const target = (radius * s) / (samples - 1)
    while (cursor < curve.length - 2 && curve[cursor + 1][0] < target) cursor += 1
    const [r0, z0] = curve[cursor]
    const [r1, z1] = curve[Math.min(cursor + 1, curve.length - 1)]
    const t = r1 === r0 ? 0 : (target - r0) / (r1 - r0)
    profile.push(Number((z0 + (z1 - z0) * Math.max(0, Math.min(1, t))).toFixed(7)))
  }
  return profile
}

function align4(value) {
  return (value + 3) & ~3
}

function build() {
  const { json: gltf, bin } = parseGlb(fs.readFileSync(SRC))
  const groups = collectPrimitives(gltf, bin)

  const entries = [...groups.entries()].map(([materialIndex, group]) => {
    const material = gltf.materials?.[materialIndex] || {}
    const pbr = material.pbrMetallicRoughness || {}
    return {
      group,
      name: material.name || `material-${materialIndex}`,
      color: pbr.baseColorFactor || [1, 1, 1, 1],
      metallic: pbr.metallicFactor ?? 1,
      roughness: pbr.roughnessFactor ?? 1,
      blend: material.alphaMode === 'BLEND',
    }
  })

  let posScale = 0
  for (const { group } of entries) {
    for (const value of group.positions) posScale = Math.max(posScale, Math.abs(value))
  }

  // The blended lens ships as a lathe profile rather than a mesh — see
  // glassProfile. Everything else is written out verbatim.
  const glass = entries.find((entry) => entry.blend) || entries[0]
  const meshEntries = entries.filter((entry) => entry !== glass)

  const blocks = []
  let byteLength = 0
  const meta = []

  for (const entry of meshEntries) {
    const { group } = entry
    const vertexCount = group.positions.length / 3
    if (vertexCount > 65535) throw new Error(`${entry.name}: too many vertices for uint16 indices`)

    const positions = new Int16Array(vertexCount * 3)
    for (let i = 0; i < positions.length; i += 1) {
      positions[i] = Math.round((group.positions[i] / posScale) * 32767)
    }
    // int8x4 rather than int8x3: GPUs want 4-byte attribute alignment, and the
    // padding byte costs less than the unaligned fetch would.
    const normals = new Int8Array(vertexCount * 4)
    for (let i = 0; i < vertexCount; i += 1) {
      normals[i * 4] = Math.round(Math.max(-1, Math.min(1, group.normals[i * 3])) * 127)
      normals[i * 4 + 1] = Math.round(Math.max(-1, Math.min(1, group.normals[i * 3 + 1])) * 127)
      normals[i * 4 + 2] = Math.round(Math.max(-1, Math.min(1, group.normals[i * 3 + 2])) * 127)
    }
    const indices = Uint16Array.from(group.indices)

    const positionOffset = align4(byteLength)
    byteLength = positionOffset + positions.byteLength
    const normalOffset = align4(byteLength)
    byteLength = normalOffset + normals.byteLength
    const indexOffset = align4(byteLength)
    byteLength = indexOffset + indices.byteLength

    blocks.push(
      { offset: positionOffset, data: positions },
      { offset: normalOffset, data: normals },
      { offset: indexOffset, data: indices },
    )
    meta.push({
      name: entry.name,
      color: entry.color.map((value) => Number(value.toFixed(6))),
      metallic: Number(entry.metallic.toFixed(4)),
      roughness: Number(entry.roughness.toFixed(4)),
      blend: entry.blend,
      vertexCount,
      indexCount: indices.length,
      position: positionOffset,
      normal: normalOffset,
      index: indexOffset,
    })
  }

  byteLength = align4(byteLength)

  const radius = glassRadius(glass.group)
  const header = {
    posScale: Number(posScale.toFixed(8)),
    bounds: sweptBounds(groups).map((value) => Number(value.toFixed(6))),
    glassRadius: Number(radius.toFixed(6)),
    glass: {
      name: glass.name,
      color: glass.color.map((value) => Number(value.toFixed(6))),
      metallic: Number(glass.metallic.toFixed(4)),
      roughness: Number(glass.roughness.toFixed(4)),
      profile: glassProfile(glass.group, radius, GLASS_PROFILE_SAMPLES),
    },
    groups: meta,
  }

  let headerText = JSON.stringify(header)
  while (headerText.length % 4 !== 0) headerText += ' '
  const headerBytes = Buffer.from(headerText, 'utf8')

  const out = Buffer.alloc(16 + headerBytes.length + byteLength)
  out.write('ICLG', 0, 'ascii')
  out.writeUInt32LE(1, 4)
  out.writeUInt32LE(headerBytes.length, 8)
  out.writeUInt32LE(byteLength, 12)
  headerBytes.copy(out, 16)
  const binaryStart = 16 + headerBytes.length
  for (const block of blocks) {
    Buffer.from(block.data.buffer, block.data.byteOffset, block.data.byteLength)
      .copy(out, binaryStart + block.offset)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT, out)

  const sourceSize = fs.statSync(SRC).size
  const bakedTriangles = meta.reduce((sum, group) => sum + group.indexCount / 3, 0)
  const lathedAway = glass.group.indices.length / 3
  console.log(
    `Baked lens model: ${meta.length} baked groups, ${bakedTriangles} tris `
    + `(glass lathed at runtime, ${lathedAway} tris kept out of the file), `
    + `${(sourceSize / 1024).toFixed(0)} kB glb -> ${(out.length / 1024).toFixed(0)} kB bin`,
  )
}

const hasSource = fs.existsSync(SRC)
const hasOutput = fs.existsSync(OUT)

if (!hasSource) {
  // The GLB lives outside git; a checkout without it still builds off the
  // committed .bin, and without either the Lens just falls back to its icon.
  console.log(
    hasOutput
      ? 'Lens model: source glb absent, keeping committed magnifying-glass.lens.bin'
      : `Lens model: no source at ${SRC} and no committed bin — lens 3D cursor disabled`,
  )
} else if (hasOutput && fs.statSync(OUT).mtimeMs >= fs.statSync(SRC).mtimeMs) {
  console.log('Lens model: magnifying-glass.lens.bin is up to date')
} else {
  build()
}
