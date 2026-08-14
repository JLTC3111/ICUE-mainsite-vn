/**
 * The 3D magnifying glass that rides the cursor inside <Lens>.
 *
 * Everything here is lazy: none of it reaches the main bundle, and it is only
 * imported once a pointer enters an enabled lens. The renderer is hand-written
 * WebGL2 rather than three.js — the baked model is three flat PBR materials
 * with no textures, skins or animation, so a ~250-line renderer covers it for a
 * few kB instead of ~170 kB of engine.
 *
 * Cost control, in rough order of impact:
 * - one shared canvas + GL context serves every <Lens> on the page (only one
 *   can be hovered at a time), torn down after IDLE_RELEASE_MS without a hover;
 * - the cursor moves the canvas with a compositor-only transform, so plain
 *   pointer movement never touches the GPU;
 * - the render loop only runs while the tilt spring is settling, and skips
 *   draws whose rotation delta is below the visible threshold;
 * - the model ships as quantised int16/int8 attributes in 3 draw calls.
 *
 * @see scripts/build-lens-model.mjs for the asset bake.
 */

const MODEL_URL = `${import.meta.env.BASE_URL || '/'}models/magnifying-glass.lens.bin`

/** Tear the GL context down after this long with no lens hovered. */
const IDLE_RELEASE_MS = 45_000
/* The magnifier is a small, softly-lit object with MSAA on, so the third of a
 * pixel a 2x buffer would add is not visible — and dropping to 1.5x removes 44%
 * of everything the GPU clears, shades and composites. */
const MAX_DPR = 1.5
/** Half-depth of the orthographic camera, in model units. */
const CAMERA_DEPTH = 0.1
/**
 * The authored glass is 34% opaque, which veils the zoomed photo the lens
 * exists to show. Thinning it keeps the tint and the rim highlights while the
 * content underneath stays readable.
 */
const GLASS_TINT_STRENGTH = 0.45

/* Spring driving handle swing and tilt. Under-damped (zeta ~0.6) so the handle
 * overshoots and settles the way a held object would. */
const SPRING_STIFFNESS = 190
const SPRING_DAMPING = 17
/** Pointer speed (px/s) producing full deflection. */
const VELOCITY_REFERENCE = 2600
/** Must stay within the swing the bake used to size the model's bounds. */
const MAX_SWING = 0.16
const MAX_TILT = 0.1
/** How fast an idle pointer's target deflection decays back to rest, per second. */
const TARGET_DECAY = 9
/** Below this rotation delta (radians) a redraw is not worth the GPU time. */
const REDRAW_EPSILON = 3e-4
/** The spring counts as at rest below these angle/velocity magnitudes. */
const REST_ANGLE = 1e-4
const REST_VELOCITY = 2e-3

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_projection;
uniform mat3 u_rotation;
uniform float u_positionScale;

out vec3 v_normal;

void main() {
  vec3 position = u_rotation * (a_position * u_positionScale);
  v_normal = u_rotation * a_normal;
  gl_Position = u_projection * vec4(position, 1.0);
}`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_normal;

uniform vec4 u_baseColor;
uniform vec2 u_pbr; // metallic, roughness

out vec4 outColor;

// The camera is orthographic, so the view vector is constant and the whole
// lighting model collapses to a handful of dot products.
const vec3 VIEW = vec3(0.0, 0.0, 1.0);
const vec3 KEY_DIR = vec3(-0.4242, 0.6869, 0.5899);
const vec3 FILL_DIR = vec3(0.6963, -0.3164, 0.6440);
const vec3 KEY_COLOR = vec3(2.150, 2.075, 1.946);
const vec3 FILL_COLOR = vec3(0.396, 0.440, 0.517);
const vec3 SKY_COLOR = vec3(0.62, 0.70, 0.83);
const vec3 GROUND_COLOR = vec3(0.16, 0.14, 0.13);

/** Two-stop vertical gradient standing in for an environment probe. */
vec3 sampleEnvironment(vec3 direction) {
  float height = direction.y * 0.5 + 0.5;
  vec3 horizon = mix(GROUND_COLOR, SKY_COLOR, 0.62);
  return height < 0.5
    ? mix(GROUND_COLOR, horizon, height * 2.0)
    : mix(horizon, SKY_COLOR, (height - 0.5) * 2.0);
}

void main() {
  // The glass disc is double sided and drawn without culling.
  vec3 normal = normalize(v_normal);
  if (!gl_FrontFacing) normal = -normal;

  float metallic = u_pbr.x;
  float roughness = clamp(u_pbr.y, 0.045, 1.0);
  vec3 albedo = u_baseColor.rgb;

  float normalDotView = clamp(dot(normal, VIEW), 0.0, 1.0);
  vec3 f0 = mix(vec3(0.04), albedo, metallic);
  vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - normalDotView, 5.0);

  float shininess = 2.0 / (roughness * roughness * roughness * roughness) - 2.0;
  float specularNormalisation = (shininess + 8.0) / 25.132741;

  vec3 keyHalf = normalize(KEY_DIR + VIEW);
  vec3 fillHalf = normalize(FILL_DIR + VIEW);
  float keySpecular = pow(max(dot(normal, keyHalf), 0.0), shininess);
  float fillSpecular = pow(max(dot(normal, fillHalf), 0.0), shininess);

  vec3 ambient = mix(GROUND_COLOR, SKY_COLOR, normal.y * 0.5 + 0.5);
  vec3 diffuse = albedo * (1.0 - metallic) * (
    max(dot(normal, KEY_DIR), 0.0) * KEY_COLOR
    + max(dot(normal, FILL_DIR), 0.0) * FILL_COLOR
    + ambient * 0.6
  );

  vec3 reflection = sampleEnvironment(reflect(-VIEW, normal)) * mix(1.0, 0.3, roughness);
  vec3 specular = fresnel * (
    (keySpecular * KEY_COLOR + fillSpecular * FILL_COLOR) * specularNormalisation
    + reflection
  );

  // Reflections off a near-clear surface are not filtered by its own opacity,
  // so they raise coverage instead — otherwise the glass would show barely a
  // sixth of its own highlights.
  float coverage = clamp(
    u_baseColor.a + dot(specular, vec3(0.2126, 0.7152, 0.0722)),
    0.0,
    1.0
  );

  vec3 straight = (diffuse * u_baseColor.a + specular) / max(coverage, 1e-4);
  straight = straight / (straight + 0.9); // Reinhard, keeps brass highlights off the clip
  // The page compositor blends in sRGB with premultiplied alpha, so encode
  // the straight colour first and premultiply after.
  outColor = vec4(pow(straight, vec3(1.0 / 2.2)) * coverage, coverage);
}`

let modelPromise = null
let runtime = null
let session = null
let releaseTimer = 0

/* ---------------------------------------------------------------- model ---- */

function parseModel(buffer) {
  const view = new DataView(buffer)
  const magic = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
  )
  if (magic !== 'ICLG') throw new Error('lens model: bad magic')
  if (view.getUint32(4, true) !== 1) throw new Error('lens model: unsupported version')

  const headerLength = view.getUint32(8, true)
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 16, headerLength)))
  const binary = 16 + headerLength

  return {
    positionScale: header.posScale,
    bounds: header.bounds,
    glassRadius: header.glassRadius,
    groups: header.groups.map((group) => ({
      color: Float32Array.of(
        group.color[0],
        group.color[1],
        group.color[2],
        group.blend ? group.color[3] * GLASS_TINT_STRENGTH : group.color[3],
      ),
      metallic: group.metallic,
      roughness: group.roughness,
      blend: group.blend,
      indexCount: group.indexCount,
      positions: new Int16Array(buffer, binary + group.position, group.vertexCount * 3),
      normals: new Int8Array(buffer, binary + group.normal, group.vertexCount * 4),
      indices: new Uint16Array(buffer, binary + group.index, group.indexCount),
    })),
  }
}

function loadModel() {
  if (!modelPromise) {
    modelPromise = fetch(MODEL_URL, { credentials: 'omit' })
      .then((response) => {
        if (!response.ok) throw new Error(`lens model: HTTP ${response.status}`)
        return response.arrayBuffer()
      })
      .then(parseModel)
      .catch((error) => {
        modelPromise = null
        throw error
      })
  }
  return modelPromise
}

/** Warms the model while the browser is idle, so the first hover is not a pop. */
export function prefetchLensGlass() {
  loadModel().catch(() => {})
}

/* -------------------------------------------------------------- gl setup ---- */

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`lens glass shader: ${log}`)
  }
  return shader
}

function createRuntime(model) {
  const canvas = document.createElement('canvas')
  canvas.className = 'lens__glass'
  canvas.setAttribute('aria-hidden', 'true')

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    // A cursor ornament is never worth waking a laptop's discrete GPU.
    powerPreference: 'low-power',
  })
  if (!gl) return null

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`lens glass program: ${log}`)
  }

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  const normalLocation = gl.getAttribLocation(program, 'a_normal')
  const uniforms = {
    projection: gl.getUniformLocation(program, 'u_projection'),
    rotation: gl.getUniformLocation(program, 'u_rotation'),
    positionScale: gl.getUniformLocation(program, 'u_positionScale'),
    baseColor: gl.getUniformLocation(program, 'u_baseColor'),
    pbr: gl.getUniformLocation(program, 'u_pbr'),
  }

  const buffers = []
  const groups = model.groups.map((group) => {
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, group.positions, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 3, gl.SHORT, true, 0, 0)

    const normalBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, group.normals, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(normalLocation)
    gl.vertexAttribPointer(normalLocation, 3, gl.BYTE, true, 4, 0)

    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, group.indices, gl.STATIC_DRAW)

    gl.bindVertexArray(null)
    buffers.push(positionBuffer, normalBuffer, indexBuffer)

    return {
      vao,
      indexCount: group.indexCount,
      blend: group.blend,
      color: group.color,
      metallic: group.metallic,
      roughness: group.roughness,
    }
  })

  gl.useProgram(program)
  gl.uniform1f(uniforms.positionScale, model.positionScale)
  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.LEQUAL)
  gl.disable(gl.CULL_FACE)
  gl.enable(gl.BLEND)
  gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  const instance = {
    canvas,
    gl,
    program,
    uniforms,
    groups,
    buffers,
    model,
    projection: new Float32Array(16),
    rotation: new Float32Array(9),
    centreX: 0,
    centreY: 0,
    width: 0,
    height: 0,
    dpr: 0,
    onContextLost: null,
  }

  instance.onContextLost = (event) => {
    event.preventDefault()
    if (runtime !== instance) return
    session?.dispose()
    destroyRuntime()
  }
  canvas.addEventListener('webglcontextlost', instance.onContextLost)

  return instance
}

function destroyRuntime() {
  if (!runtime) return
  const { gl, canvas } = runtime
  canvas.removeEventListener('webglcontextlost', runtime.onContextLost)
  for (const group of runtime.groups) gl.deleteVertexArray(group.vao)
  for (const buffer of runtime.buffers) gl.deleteBuffer(buffer)
  gl.deleteProgram(runtime.program)
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  canvas.remove()
  runtime = null
}

/**
 * Sizes the canvas to the model's swing-swept bounds.
 *
 * By default the magnifier is scaled so its bezel's inner rim circumscribes the
 * zoom circle exactly — the ratio is derived from the baked bounds rather than
 * written as a literal, so re-baking the model cannot desynchronise the two.
 * That makes the magnifier about 2.4x the zoom diameter (this one's handle is
 * longer than its head), which leaves the caller's `lensSize` as the real cost
 * dial: the canvas is square and every pixel of it is cleared, shaded and
 * composited, so cost grows with its square. `glassSize` overrides the framing
 * outright, at the price of the magnifier no longer lining up with the zoom.
 */
function configure(instance, lensSize, glassSize) {
  const { gl, model } = instance
  const [minX, minY, maxX, maxY] = model.bounds
  const modelWidth = maxX - minX
  const size = glassSize ?? (lensSize * modelWidth) / (2 * model.glassRadius)
  const pixelsPerUnit = size / modelWidth
  const width = Math.ceil((maxX - minX) * pixelsPerUnit)
  const height = Math.ceil((maxY - minY) * pixelsPerUnit)
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)

  // Where the bezel's centre sits inside the canvas, in CSS px.
  instance.centreX = -minX * pixelsPerUnit
  instance.centreY = maxY * pixelsPerUnit

  if (instance.width === width && instance.height === height && instance.dpr === dpr) return

  instance.width = width
  instance.height = height
  instance.dpr = dpr
  instance.canvas.width = Math.round(width * dpr)
  instance.canvas.height = Math.round(height * dpr)
  instance.canvas.style.width = `${width}px`
  instance.canvas.style.height = `${height}px`
  gl.viewport(0, 0, instance.canvas.width, instance.canvas.height)

  // Orthographic: with no perspective divide the bezel stays a true circle
  // around the CSS mask, at any tilt.
  const projection = instance.projection
  projection.fill(0)
  projection[0] = 2 / (maxX - minX)
  projection[5] = 2 / (maxY - minY)
  projection[10] = -1 / CAMERA_DEPTH
  projection[12] = -(maxX + minX) / (maxX - minX)
  projection[13] = -(maxY + minY) / (maxY - minY)
  projection[15] = 1
  gl.uniformMatrix4fv(instance.uniforms.projection, false, projection)
}

/** RotX(tiltX) * RotY(tiltY) * RotZ(swing), written column-major for GLSL. */
function setRotation(target, tiltX, tiltY, swing) {
  const sinX = Math.sin(tiltX)
  const cosX = Math.cos(tiltX)
  const sinY = Math.sin(tiltY)
  const cosY = Math.cos(tiltY)
  const sinZ = Math.sin(swing)
  const cosZ = Math.cos(swing)

  target[0] = cosY * cosZ
  target[1] = cosX * sinZ + sinX * sinY * cosZ
  target[2] = sinX * sinZ - cosX * sinY * cosZ
  target[3] = -cosY * sinZ
  target[4] = cosX * cosZ - sinX * sinY * sinZ
  target[5] = sinX * cosZ + cosX * sinY * sinZ
  target[6] = sinY
  target[7] = -sinX * cosY
  target[8] = cosX * cosY
}

function draw(instance, tiltX, tiltY, swing) {
  const { gl, uniforms } = instance
  setRotation(instance.rotation, tiltX, tiltY, swing)
  gl.uniformMatrix3fv(uniforms.rotation, false, instance.rotation)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  for (const group of instance.groups) {
    // The bake orders opaque groups first, so the blended glass — which must
    // not write depth — is always drawn over settled geometry.
    gl.depthMask(!group.blend)
    gl.uniform4fv(uniforms.baseColor, group.color)
    gl.uniform2f(uniforms.pbr, group.metallic, group.roughness)
    gl.bindVertexArray(group.vao)
    gl.drawElements(gl.TRIANGLES, group.indexCount, gl.UNSIGNED_SHORT, 0)
  }
  gl.depthMask(true)
  gl.bindVertexArray(null)
}

/* -------------------------------------------------------------- session ---- */

function clamp(value, limit) {
  return value < -limit ? -limit : value > limit ? limit : value
}

function createSession(instance, container, lensSize, glassSize, originX, originY) {
  const { canvas } = instance
  configure(instance, lensSize, glassSize)

  let pointerX = originX
  let pointerY = originY
  let lastMoveTime = performance.now()
  let hasVelocity = false

  let swing = 0
  let swingVelocity = 0
  let tiltX = 0
  let tiltXVelocity = 0
  let tiltY = 0
  let tiltYVelocity = 0
  let targetSwing = 0
  let targetTiltX = 0
  let targetTiltY = 0

  let drawnSwing = 0
  let drawnTiltX = 0
  let drawnTiltY = 0

  let frame = 0
  let lastFrameTime = 0
  let disposed = false

  const place = (x, y) => {
    canvas.style.transform =
      `translate3d(${x - instance.centreX}px, ${y - instance.centreY}px, 0)`
  }

  const tick = (now) => {
    frame = 0
    if (disposed) return

    const dt = Math.min((now - lastFrameTime) / 1000, 1 / 30)
    lastFrameTime = now

    const decay = Math.exp(-TARGET_DECAY * dt)
    targetSwing *= decay
    targetTiltX *= decay
    targetTiltY *= decay

    swing += swingVelocity * dt
    swingVelocity += (-SPRING_STIFFNESS * (swing - targetSwing) - SPRING_DAMPING * swingVelocity) * dt
    tiltX += tiltXVelocity * dt
    tiltXVelocity += (-SPRING_STIFFNESS * (tiltX - targetTiltX) - SPRING_DAMPING * tiltXVelocity) * dt
    tiltY += tiltYVelocity * dt
    tiltYVelocity += (-SPRING_STIFFNESS * (tiltY - targetTiltY) - SPRING_DAMPING * tiltYVelocity) * dt

    const atRest = Math.abs(swing) < REST_ANGLE && Math.abs(swingVelocity) < REST_VELOCITY
      && Math.abs(tiltX) < REST_ANGLE && Math.abs(tiltXVelocity) < REST_VELOCITY
      && Math.abs(tiltY) < REST_ANGLE && Math.abs(tiltYVelocity) < REST_VELOCITY

    if (atRest) {
      swing = 0
      swingVelocity = 0
      tiltX = 0
      tiltXVelocity = 0
      tiltY = 0
      tiltYVelocity = 0
    }

    if (atRest
      || Math.abs(swing - drawnSwing) > REDRAW_EPSILON
      || Math.abs(tiltX - drawnTiltX) > REDRAW_EPSILON
      || Math.abs(tiltY - drawnTiltY) > REDRAW_EPSILON) {
      draw(instance, tiltX, tiltY, swing)
      drawnSwing = swing
      drawnTiltX = tiltX
      drawnTiltY = tiltY
    }

    // Settled: leave the last frame on screen and stop claiming rAF slots.
    if (!atRest && !document.hidden) frame = requestAnimationFrame(tick)
  }

  place(originX, originY)
  draw(instance, 0, 0, 0)
  canvas.classList.remove('is-visible')
  container.appendChild(canvas)
  // Next frame, so the opacity transition actually has two values to run between.
  requestAnimationFrame(() => {
    if (!disposed) canvas.classList.add('is-visible')
  })

  const self = {
    container,
    move(x, y) {
      if (disposed) return
      // Position is a compositor-only transform applied immediately: the bezel
      // has to stay locked to the CSS mask circle, so it must never lag a frame
      // behind the pointer the way the spring-driven tilt does.
      place(x, y)

      const now = performance.now()
      const dt = Math.min(Math.max((now - lastMoveTime) / 1000, 1 / 240), 0.1)
      if (hasVelocity) {
        const velocityX = (x - pointerX) / dt
        const velocityY = (y - pointerY) / dt
        targetSwing = clamp(-velocityX / VELOCITY_REFERENCE, MAX_SWING)
        targetTiltY = clamp(velocityX / VELOCITY_REFERENCE, MAX_TILT)
        targetTiltX = clamp(-velocityY / VELOCITY_REFERENCE, MAX_TILT)
        if (!frame) {
          lastFrameTime = now
          frame = requestAnimationFrame(tick)
        }
      }
      pointerX = x
      pointerY = y
      lastMoveTime = now
      hasVelocity = true
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      // The canvas is shared. A session that has already been superseded — two
      // lenses hovered in quick succession, or a mount that resolved after its
      // pointer left — must not pull it out from under the live one.
      if (session !== self) return
      canvas.classList.remove('is-visible')
      canvas.remove()
      session = null
      scheduleRelease()
    },
  }

  return self
}

function scheduleRelease() {
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => {
    if (!session) destroyRuntime()
  }, IDLE_RELEASE_MS)
}

/**
 * Mounts the shared magnifying glass into `container`, centred on the pointer.
 * Resolves to `null` when WebGL2 or the baked model is unavailable, in which
 * case <Lens> keeps its flat icon.
 *
 * @param {HTMLElement} container positioned ancestor the canvas is placed in
 * @param {number} lensSize diameter in CSS px of the lens' zoom circle
 * @param {number} [glassSize] overrides the magnifier's overall width in CSS px
 * @param {number} x pointer position within the container, in CSS px
 * @param {number} y pointer position within the container, in CSS px
 * @returns {Promise<{ move(x: number, y: number): void, dispose(): void } | null>}
 */
export async function mountLensGlass(container, lensSize, glassSize, x, y) {
  let model
  try {
    model = await loadModel()
  } catch {
    return null
  }

  session?.dispose()
  clearTimeout(releaseTimer)

  if (!runtime) {
    try {
      runtime = createRuntime(model)
    } catch {
      runtime = null
    }
    if (!runtime) return null
  }

  session = createSession(runtime, container, lensSize, glassSize, x, y)
  return session
}
