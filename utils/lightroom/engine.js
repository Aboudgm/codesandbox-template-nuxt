// Raw WebGL2 engine for the "small light in an empty room" scene.
// No dependencies.
// - 32^3 stable-fluids air (heat plume, swirl, vorticity confinement,
//   pressure projection) that the dust rides
// - GPU particle physics (ping-pong float textures), per-body weight
// - distance-binned point-light shadow cube (soft shadows + light shafts)
// - gather DOF for the big cubes, motion-blurred bokeh streaks for the dust
// - HDR bloom, heat shimmer, photographic grade
import {
  FULLSCREEN_VS,
  AIR_ADVECT_FS,
  AIR_CURL_FS,
  AIR_DIV_FS,
  AIR_JACOBI_FS,
  AIR_GRAD_FS,
  UPDATE_FS,
  SHADOWPT_VS,
  SHADOWPT_FS,
  CYC_VS,
  CYC_FS,
  CUBE_VS,
  CUBE_FS,
  FOG_FS,
  DOF_FS,
  SPRITE_VS,
  SPRITE_FS,
  BULB_VS,
  BULB_FS,
  BLOOM_DOWN_FS,
  BLOOM_UP_FS,
  COMPOSITE_FS,
} from './shaders'

// ------------------------------------------------------------------ math
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
  },
}

function perspective(fovy, aspect, n, f) {
  const t = 1 / Math.tan(fovy / 2)
  const o = new Float32Array(16)
  o[0] = t / aspect
  o[5] = t
  o[10] = (f + n) / (n - f)
  o[11] = -1
  o[14] = (2 * f * n) / (n - f)
  return o
}

function lookAt(eye, target, up) {
  const z = v3.norm(v3.sub(eye, target))
  const x = v3.norm(v3.cross(up, z))
  const y = v3.cross(z, x)
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1,
  ]) // prettier-ignore
}

function mul(a, b) {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
      o[c * 4 + r] = s
    }
  }
  return o
}

function project(m, p) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]
  const ww = Math.max(w, 1e-3)
  return [x / ww / 2 + 0.5, y / ww / 2 + 0.5]
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt))

// ---------------------------------------------------------------- GL utils
class Prog {
  constructor(gl, vsSrc, fsSrc, name) {
    this.gl = gl
    this.name = name
    const vs = this.compile(gl.VERTEX_SHADER, vsSrc)
    const fs = this.compile(gl.FRAGMENT_SHADER, fsSrc)
    const p = gl.createProgram()
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(`link ${name}: ${gl.getProgramInfoLog(p)}`)
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    this.program = p
    this.locs = {}
  }

  compile(type, src) {
    const gl = this.gl
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s)
      const lines = src.split('\n')
      const m = /ERROR: \d+:(\d+)/.exec(log || '')
      const ctx = m
        ? lines.slice(Math.max(0, +m[1] - 3), +m[1] + 1).join('\n')
        : ''
      const kind = type === gl.VERTEX_SHADER ? 'VS' : 'FS'
      throw new Error(`compile ${this.name} ${kind}: ${log}\n${ctx}`)
    }
    return s
  }

  use() {
    this.gl.useProgram(this.program)
    return this
  }

  u(n) {
    if (!(n in this.locs)) {
      this.locs[n] = this.gl.getUniformLocation(this.program, n)
    }
    return this.locs[n]
  }

  f(n, v) { this.gl.uniform1f(this.u(n), v) } // prettier-ignore
  i(n, v) { this.gl.uniform1i(this.u(n), v) } // prettier-ignore
  v2(n, a, b) { this.gl.uniform2f(this.u(n), a, b) } // prettier-ignore
  v3(n, a) { this.gl.uniform3f(this.u(n), a[0], a[1], a[2]) } // prettier-ignore
  m4(n, m) { this.gl.uniformMatrix4fv(this.u(n), false, m) } // prettier-ignore
}

const FACES = [
  { f: [1, 0, 0], u: [0, -1, 0] },
  { f: [-1, 0, 0], u: [0, -1, 0] },
  { f: [0, 1, 0], u: [0, 0, 1] },
  { f: [0, -1, 0], u: [0, 0, -1] },
  { f: [0, 0, 1], u: [0, -1, 0] },
  { f: [0, 0, -1], u: [0, -1, 0] },
]

// room dimensions (world units)
const FLOOR_Y = -1.55
const CYC_R = 2.6
const CYC_Z = -2.2
// air grid: 32^3 cells over this box, packed in a 256x128 atlas
const G_MIN = [-6.5, FLOOR_Y, -5.0]
const G_SIZE = [13, 8, 9.5]
const G_W = 256
const G_H = 128

export class LightRoom {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.opts = opts
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    if (!gl) throw new Error('WebGL2 is not available')
    if (!gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('Float render targets are not available')
    }
    this.gl = gl
    this.lost = false
    this.running = false
    this.raf = 0
    this.disposed = false

    const coarse =
      typeof matchMedia === 'function' &&
      matchMedia('(pointer: coarse)').matches
    this.texSize = opts.tex || (coarse ? 128 : 256)
    this.N = this.texSize * this.texSize
    this.nBig = Math.round(this.N * 0.03)
    this.nMid = Math.round(this.N * 0.12)
    this.shadowRes = coarse ? 128 : 192
    this.jacobiIters = coarse ? 10 : 16

    this.scale = opts.scale || (coarse ? 0.7 : 1)
    this.maxPixels = coarse ? 1.4e6 : 2.6e6
    this.tune = {
      lightI: 9,
      haze: 0.011,
      exposure: 1.25,
      bloomK: 0.55,
      shK: 3.2,
      amb: 0.007,
      cycFall: 1.12,
      grav: 1.25,
      heat: 2.4,
      swirl: 1.7,
      vort: 0.8,
      noise: 0.3,
      airDamp: 0.8,
      shutter: 0.022,
      shimmer: 1,
      lift: 0.03,
    }
    this.state = {
      t: 0,
      intro: 0,
      light: [0.2, 0.5, 0.4],
      lightPrev: [0.2, 0.5, 0.4],
      lightVel: [0, 0, 0],
      pointerTarget: null,
      lastPointerAt: -1e9,
      hold: 0,
      holdTarget: 0,
      burst: 0,
      focus: 7,
      parX: 0,
      parY: 0,
      swirlAxis: [0.25, 0.45, 1],
      focusOff: 0,
      shockT: 9,
      shockAmp: 0,
    }
    this.ema = 1 / 60
    this.slowFrames = 0
    this.fastFrames = 0
    this.frameNo = 0

    this.onLost = (e) => {
      e.preventDefault()
      this.lost = true
      this.stop()
      if (opts.onLost) opts.onLost()
    }
    this.onRestored = () => {
      if (opts.onRestored) opts.onRestored()
    }
    canvas.addEventListener('webglcontextlost', this.onLost)
    canvas.addEventListener('webglcontextrestored', this.onRestored)

    this.buildPrograms()
    this.buildGeometry()
    this.buildParticles()
    this.buildAir()
    this.buildShadow()
    this.resize(true)
  }

  // ----------------------------------------------------------------- setup
  buildPrograms() {
    const gl = this.gl
    const P = (vs, fs, n) => new Prog(gl, vs, fs, n)
    this.pAdvect = P(FULLSCREEN_VS, AIR_ADVECT_FS, 'airAdvect')
    this.pCurl = P(FULLSCREEN_VS, AIR_CURL_FS, 'airCurl')
    this.pDiv = P(FULLSCREEN_VS, AIR_DIV_FS, 'airDiv')
    this.pJacobi = P(FULLSCREEN_VS, AIR_JACOBI_FS, 'airJacobi')
    this.pGrad = P(FULLSCREEN_VS, AIR_GRAD_FS, 'airGrad')
    this.pUpdate = P(FULLSCREEN_VS, UPDATE_FS, 'update')
    this.pShadow = P(SHADOWPT_VS, SHADOWPT_FS, 'shadow')
    this.pCyc = P(CYC_VS, CYC_FS, 'cyc')
    this.pCube = P(CUBE_VS, CUBE_FS, 'cube')
    this.pFog = P(FULLSCREEN_VS, FOG_FS, 'fog')
    this.pDof = P(FULLSCREEN_VS, DOF_FS, 'dof')
    this.pSprite = P(SPRITE_VS, SPRITE_FS, 'sprite')
    this.pBulb = P(BULB_VS, BULB_FS, 'bulb')
    this.pDown = P(FULLSCREEN_VS, BLOOM_DOWN_FS, 'bloomDown')
    this.pUp = P(FULLSCREEN_VS, BLOOM_UP_FS, 'bloomUp')
    this.pComp = P(FULLSCREEN_VS, COMPOSITE_FS, 'composite')
    this.emptyVao = gl.createVertexArray()
  }

  buildGeometry() {
    const gl = this.gl

    // unit cube, 36 vertices, per-face normals
    const axes = [
      { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
      { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
      { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
      { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
      { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
      { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
    ]
    const pos = []
    const nrm = []
    for (const a of axes) {
      const corner = (su, sv) => [
        a.n[0] + a.u[0] * su + a.v[0] * sv,
        a.n[1] + a.u[1] * su + a.v[1] * sv,
        a.n[2] + a.u[2] * su + a.v[2] * sv,
      ]
      const c = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
      for (const k of [0, 1, 2, 0, 2, 3]) {
        pos.push(...c[k])
        nrm.push(...a.n)
      }
    }
    this.cubeVao = gl.createVertexArray()
    gl.bindVertexArray(this.cubeVao)
    for (const [loc, data] of [
      [0, pos],
      [1, nrm],
    ]) {
      const b = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
    }

    // cyclorama: floor -> quarter pipe -> wall, extruded along x
    const prof = [] // [y, z, ny, nz]
    prof.push([FLOOR_Y, 40, 1, 0])
    prof.push([FLOOR_Y, CYC_Z, 1, 0])
    const seg = 48
    const yc = FLOOR_Y + CYC_R
    for (let s = 1; s <= seg; s++) {
      const th = (s / seg) * Math.PI * 0.5
      prof.push([
        yc - CYC_R * Math.cos(th),
        CYC_Z - CYC_R * Math.sin(th),
        Math.cos(th),
        Math.sin(th),
      ])
    }
    prof.push([FLOOR_Y + CYC_R + 12, CYC_Z - CYC_R, 0, 1])
    const XW = 30
    const cp = []
    const ci = []
    prof.forEach((p, k) => {
      cp.push(-XW, p[0], p[1], 0, p[2], p[3])
      cp.push(XW, p[0], p[1], 0, p[2], p[3])
      if (k > 0) {
        const a = (k - 1) * 2
        ci.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    })
    this.cycVao = gl.createVertexArray()
    gl.bindVertexArray(this.cycVao)
    const vb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vb)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cp), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
    const ib = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ci), gl.STATIC_DRAW)
    this.cycCount = ci.length
    gl.bindVertexArray(null)
  }

  tex2D(w, h, internal, format, type, filter, data = null) {
    const gl = this.gl
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  fbo(colors, depthRb = null, name = 'fbo') {
    const gl = this.gl
    const f = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    colors.forEach((t, i) => {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + i,
        gl.TEXTURE_2D,
        t,
        0
      )
    })
    if (depthRb) {
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        depthRb
      )
    }
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (st !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`framebuffer ${name} incomplete: 0x${st.toString(16)}`)
    }
    return f
  }

  buildParticles() {
    const gl = this.gl
    const T = this.texSize
    const N = this.N
    const pos = new Float32Array(N * 4)
    const vel = new Float32Array(N * 4)
    const rand = Math.random
    for (let i = 0; i < N; i++) {
      const big = i < this.nBig
      const mid = !big && i < this.nBig + this.nMid
      const R = big ? 2.7 : mid ? 2.5 : 2.3
      const z = rand() * 2 - 1
      const a = rand() * Math.PI * 2
      const s = Math.sqrt(1 - z * z)
      const r = 0.75 + R * Math.pow(rand(), 0.62)
      const x = s * Math.cos(a) * r
      let y = z * r * 0.72 + 0.1
      const zz = s * Math.sin(a) * r
      y = Math.max(y, FLOOR_Y + 0.2)
      pos.set([x, y, zz, rand() * 6.28], i * 4)
      const sw = 0.55 / (0.6 + r * 0.4)
      const j = () => (rand() - 0.5) * 0.3
      vel.set([-zz * sw + j(), j(), x * sw + j(), 0], i * 4)
    }
    const { RGBA32F, RGBA, FLOAT, NEAREST } = gl
    this.posTex = []
    this.velTex = []
    this.simFbo = []
    for (let k = 0; k < 2; k++) {
      const p0 = k === 0 ? pos : null
      const v0 = k === 0 ? vel : null
      this.posTex[k] = this.tex2D(T, T, RGBA32F, RGBA, FLOAT, NEAREST, p0)
      this.velTex[k] = this.tex2D(T, T, RGBA32F, RGBA, FLOAT, NEAREST, v0)
      this.simFbo[k] = this.fbo([this.posTex[k], this.velTex[k]], null, 'sim')
    }
    this.cur = 0
  }

  buildAir() {
    const gl = this.gl
    const mk = (filter) => {
      const t = this.tex2D(G_W, G_H, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, filter)
      return { tex: t, fbo: this.fbo([t], null, 'air') }
    }
    this.air = {
      vel: [mk(gl.LINEAR), mk(gl.LINEAR)],
      p: [mk(gl.NEAREST), mk(gl.NEAREST)],
      curl: mk(gl.NEAREST),
      div: mk(gl.NEAREST),
      cur: 0,
      pcur: 0,
    }
    for (const t of [...this.air.vel, ...this.air.p, this.air.curl]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
      gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0])
    }
  }

  buildShadow() {
    const gl = this.gl
    const S = this.shadowRes
    const CUBE = gl.TEXTURE_CUBE_MAP
    this.shadowTex = gl.createTexture()
    gl.bindTexture(CUBE, this.shadowTex)
    for (let f = 0; f < 6; f++) {
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + f,
        0,
        gl.RGBA16F,
        S,
        S,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      )
    }
    gl.texParameteri(CUBE, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(CUBE, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(CUBE, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(CUBE, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.shadowFbo = []
    for (let f = 0; f < 6; f++) {
      const fb = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + f,
        this.shadowTex,
        0
      )
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
      if (st !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('shadow framebuffer incomplete')
      }
      this.shadowFbo.push(fb)
    }
  }

  freeTargets() {
    const gl = this.gl
    if (!this.targets) return
    const t = this.targets
    for (const x of t.textures) gl.deleteTexture(x)
    for (const x of t.fbos) gl.deleteFramebuffer(x)
    gl.deleteRenderbuffer(t.depth)
    this.targets = null
  }

  allocTargets(W, H) {
    const gl = this.gl
    this.freeTargets()
    const textures = []
    const fbos = []
    const { RGBA16F, RGBA, HALF_FLOAT, LINEAR } = gl
    const T = (w, h, ...rest) => {
      const x = this.tex2D(w, h, ...rest)
      textures.push(x)
      return x
    }
    const F = (colors, depth, name) => {
      const f = this.fbo(colors, depth, name)
      fbos.push(f)
      return f
    }
    const depth = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H)

    const sceneTex = T(W, H, RGBA16F, RGBA, HALF_FLOAT, LINEAR)
    const distTex = T(W, H, gl.R32F, gl.RED, gl.FLOAT, gl.NEAREST)
    const sceneFbo = F([sceneTex, distTex], depth, 'scene')

    const fw = Math.max(2, W >> 1)
    const fh = Math.max(2, H >> 1)
    const fogTex = T(fw, fh, RGBA16F, RGBA, HALF_FLOAT, LINEAR)
    const fogFbo = F([fogTex], null, 'fog')

    const dofTex = T(W, H, RGBA16F, RGBA, HALF_FLOAT, LINEAR)
    const dofFbo = F([dofTex], depth, 'dof')

    const bloom = []
    let bw = W
    let bh = H
    for (let i = 0; i < 6; i++) {
      bw = Math.max(2, bw >> 1)
      bh = Math.max(2, bh >> 1)
      const tx = T(bw, bh, RGBA16F, RGBA, HALF_FLOAT, LINEAR)
      bloom.push({ tex: tx, fbo: F([tx], null, 'bloom'), w: bw, h: bh })
    }
    this.targets = {
      W, H, fw, fh, textures, fbos, depth,
      sceneTex, distTex, sceneFbo, fogTex, fogFbo, dofTex, dofFbo, bloom,
    } // prettier-ignore
  }

  resize(force = false) {
    const c = this.canvas
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    let w = (c.clientWidth || 1) * dpr * this.scale
    let h = (c.clientHeight || 1) * dpr * this.scale
    const px = w * h
    if (px > this.maxPixels) {
      const k = Math.sqrt(this.maxPixels / px)
      w *= k
      h *= k
    }
    w = Math.max(64, Math.floor(w))
    h = Math.max(64, Math.floor(h))
    const t = this.targets
    if (!force && t && t.W === w && t.H === h) return
    c.width = w
    c.height = h
    this.allocTargets(w, h)
  }

  // ------------------------------------------------------------ interaction
  setPointer(nx, ny) {
    this.state.pointerTarget = [nx, ny]
    this.state.lastPointerAt = this.state.t
  }

  setHold(on) {
    const s = this.state
    if (!on && s.holdTarget > 0) {
      s.burst = 0.35 + 0.65 * s.hold
      s.shockT = 0
      s.shockAmp = s.burst
    }
    s.holdTarget = on ? 1 : 0
    s.lastPointerAt = s.t
  }

  // scroll = rack focus through the cloud (offset from the bulb)
  rackFocus(deltaY) {
    const s = this.state
    s.focusOff = clamp(s.focusOff + deltaY * 0.0035, -3.5, 3.5)
    s.lastPointerAt = s.t
  }

  // ------------------------------------------------------------------ loop
  start() {
    if (this.running || this.lost || this.disposed) return
    this.running = true
    this.last = performance.now()
    const loop = (now) => {
      if (!this.running) return
      this.raf = requestAnimationFrame(loop)
      try {
        this.frame(now)
      } catch (e) {
        this.stop()
        if (this.opts.onError) this.opts.onError(e)
        else throw e
      }
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  dispose() {
    this.disposed = true
    this.stop()
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored)
    const ext = this.gl.getExtension('WEBGL_lose_context')
    if (ext && !this.lost) ext.loseContext()
  }

  bind2D(unit, tex) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
  }

  fullscreen() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)
  }

  // ---- air: advect + forces -> divergence -> pressure -> project -> curl
  stepAir(dt) {
    const gl = this.gl
    const s = this.state
    const tn = this.tune
    const A = this.air
    gl.viewport(0, 0, G_W, G_H)
    const grid = (p) => {
      p.v3('uGMin', G_MIN)
      p.v3('uGSize', G_SIZE)
    }

    let p = this.pAdvect.use()
    grid(p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.vel[1 - A.cur].fbo)
    this.bind2D(0, A.vel[A.cur].tex)
    this.bind2D(1, A.curl.tex)
    p.i('uVel', 0)
    p.i('uCurl', 1)
    p.f('uDt', dt)
    p.f('uTime', s.t)
    p.v3('uLight', s.light)
    p.v3('uLightVel', s.lightVel)
    p.v3('uSwirlAxis', s.swirlAxis)
    p.f('uHold', s.hold)
    p.f('uBurst', s.burst)
    p.f('uHeat', tn.heat * s.intro)
    p.f('uSwirl', tn.swirl)
    p.f('uVort', tn.vort)
    p.f('uNoise', tn.noise)
    p.f('uDamp', tn.airDamp)
    this.fullscreen()
    A.cur = 1 - A.cur

    p = this.pDiv.use()
    grid(p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.div.fbo)
    this.bind2D(0, A.vel[A.cur].tex)
    p.i('uVel', 0)
    this.fullscreen()

    p = this.pJacobi.use()
    grid(p)
    this.bind2D(1, A.div.tex)
    p.i('uDiv', 1)
    p.i('uP', 0)
    for (let k = 0; k < this.jacobiIters; k++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.p[1 - A.pcur].fbo)
      this.bind2D(0, A.p[A.pcur].tex)
      this.fullscreen()
      A.pcur = 1 - A.pcur
    }

    p = this.pGrad.use()
    grid(p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.vel[1 - A.cur].fbo)
    this.bind2D(0, A.vel[A.cur].tex)
    this.bind2D(1, A.p[A.pcur].tex)
    p.i('uVel', 0)
    p.i('uP', 1)
    this.fullscreen()
    A.cur = 1 - A.cur

    p = this.pCurl.use()
    grid(p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.curl.fbo)
    this.bind2D(0, A.vel[A.cur].tex)
    p.i('uVel', 0)
    this.fullscreen()
  }

  frame(now) {
    const gl = this.gl
    const s = this.state
    const tn = this.tune
    const dtRaw = Math.min((now - this.last) / 1000, 0.1)
    this.last = now
    const dt = Math.min(dtRaw, 1 / 30)
    s.t += dt
    this.frameNo++
    this.adapt(dtRaw)
    this.resize()
    const tg = this.targets
    const { W, H } = tg
    const aspect = W / H

    // ---- camera
    const tanH = Math.tan((19 * Math.PI) / 180) * Math.max(1, 1.15 / aspect)
    const fovY = 2 * Math.atan(tanH)
    const px = s.pointerTarget ? s.pointerTarget[0] : 0
    const py = s.pointerTarget ? s.pointerTarget[1] : 0
    s.parX = damp(s.parX, px, 1.6, dt)
    s.parY = damp(s.parY, py, 1.6, dt)
    const sway = Math.sin(s.t * 0.21) * 0.12
    const eye = [
      s.parX * 0.55 + sway,
      0.38 + s.parY * 0.18 + Math.sin(s.t * 0.17) * 0.04,
      7.4,
    ]
    const target = [s.parX * -0.15, -0.15, 0]
    const view = lookAt(eye, target, [0, 1, 0])
    const proj = perspective(fovY, aspect, 0.1, 80)
    const vp = mul(proj, view)
    const fwd = v3.norm(v3.sub(target, eye))
    const right = v3.norm(v3.cross(fwd, [0, 1, 0]))
    const up = v3.cross(right, fwd)

    // ---- light motion (pointer driven, drifts on its own when idle)
    const idle = s.t - s.lastPointerAt > 3.5 || !s.pointerTarget
    let tgt
    if (idle) {
      const k = s.t
      tgt = [
        2.3 * Math.sin(k * 0.31) + 0.6 * Math.sin(k * 0.83),
        0.25 + 0.95 * Math.sin(k * 0.47 + 1.0),
        0.5 + 0.9 * Math.sin(k * 0.23 + 0.5),
      ]
    } else {
      const dir = v3.norm(
        v3.add(
          v3.add(fwd, v3.scale(right, s.pointerTarget[0] * tanH * aspect)),
          v3.scale(up, s.pointerTarget[1] * tanH)
        )
      )
      const zPlane = 0.5
      const tt = (zPlane - eye[2]) / dir[2]
      tgt = [eye[0] + dir[0] * tt, eye[1] + dir[1] * tt, zPlane]
    }
    tgt[0] = clamp(tgt[0], -4.6, 4.6)
    tgt[1] = clamp(tgt[1], FLOOR_Y + 0.4, 3.4)
    const lk = 1 - Math.exp(-dt * 5.2)
    s.lightPrev = s.light.slice()
    // spring toward the target, but the light has weight: capped speed
    let step = v3.scale(v3.sub(tgt, s.light), lk)
    const stepLen = v3.len(step)
    const maxStep = 6.5 * dt
    if (stepLen > maxStep) step = v3.scale(step, maxStep / stepLen)
    s.light = v3.add(s.light, step)
    const lv = v3.scale(v3.sub(s.light, s.lightPrev), 1 / Math.max(dt, 1e-3))
    s.lightVel = s.lightVel.map((x, i) => damp(x, lv[i], 10, dt))
    s.hold = damp(s.hold, s.holdTarget, 4, dt)
    s.burst *= Math.exp(-dt * 6)
    s.shockT += dt
    s.intro = smoothstep(0.15, 2.4, s.t)

    // vortex axis: mostly facing the camera (spiral arms read on screen),
    // precessing slowly, and tipped by the light's motion
    const base = [
      0.3 * Math.sin(s.t * 0.13),
      0.45 + 0.2 * Math.sin(s.t * 0.07),
      1,
    ]
    const tip = v3.scale(v3.cross(s.lightVel, [0, 0, 1]), 0.18)
    const axT = v3.norm(v3.add(base, tip))
    s.swirlAxis = v3.norm(s.swirlAxis.map((x, i) => damp(x, axT[i], 1.5, dt)))

    const lightI = tn.lightI * s.intro
    const beamDir = v3.norm(v3.sub([1.9, -1.1, -4.2], s.light))
    const focusT = Math.max(1.5, v3.len(v3.sub(s.light, eye)) + s.focusOff)
    s.focus = damp(s.focus, focusT, 2.4, dt)
    const cocScale = 0.034 * H
    const maxCoc = cocScale
    const focalPx = (0.5 * H) / tanH

    gl.bindVertexArray(this.emptyVao)
    gl.disable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)

    // ---- 0. air
    this.stepAir(dt)

    // ---- 1. particles (2 substeps), riding the air
    {
      const T = this.texSize
      const p = this.pUpdate.use()
      p.i('uTex', T)
      p.i('uNBig', this.nBig)
      p.i('uNMid', this.nMid)
      p.v3('uGMin', G_MIN)
      p.v3('uGSize', G_SIZE)
      p.f('uDt', dt / 2)
      p.f('uTime', s.t)
      p.v3('uLight', s.light)
      p.f('uHold', s.hold)
      p.f('uBurst', s.burst)
      p.f('uFloorY', FLOOR_Y)
      p.f('uCycZ', CYC_Z)
      p.f('uCycR', CYC_R)
      p.f('uGrav', tn.grav)
      this.bind2D(2, this.air.vel[this.air.cur].tex)
      p.i('uAir', 2)
      gl.viewport(0, 0, T, T)
      for (let k = 0; k < 2; k++) {
        const nxt = 1 - this.cur
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.simFbo[nxt])
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
        this.bind2D(0, this.posTex[this.cur])
        this.bind2D(1, this.velTex[this.cur])
        p.i('uPosT', 0)
        p.i('uVelT', 1)
        this.fullscreen()
        this.cur = nxt
      }
    }
    const posT = this.posTex[this.cur]
    const velT = this.velTex[this.cur]

    // ---- 2. light shadow cube (distance-binned coverage)
    {
      const S = this.shadowRes
      const p = this.pShadow.use()
      p.i('uTex', this.texSize)
      p.i('uNBig', this.nBig)
      p.i('uNMid', this.nMid)
      p.v3('uLight', s.light)
      p.f('uFocalPx', S / 2)
      p.f('uSoft', 3)
      this.bind2D(0, posT)
      p.i('uPosT', 0)
      const fp = perspective(Math.PI / 2, 1, 0.02, 40)
      gl.viewport(0, 0, S, S)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      for (let f = 0; f < 6; f++) {
        const F = FACES[f]
        const m = mul(fp, lookAt(s.light, v3.add(s.light, F.f), F.u))
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo[f])
        gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0])
        p.m4('uFace', m)
        gl.drawArrays(gl.POINTS, 0, this.N)
      }
      gl.disable(gl.BLEND)
    }

    const setLight = (p) => {
      p.v3('uLight', s.light)
      p.f('uLightI', lightI)
      p.v3('uBeamDir', beamDir)
      p.v3('uCam', eye)
      p.f('uFloorY', FLOOR_Y)
      p.f('uShK', tn.shK)
      p.f('uFocus', s.focus)
      p.f('uCocScale', cocScale)
      p.f('uMaxCoc', maxCoc)
      p.f('uAmb', tn.amb)
      gl.activeTexture(gl.TEXTURE5)
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.shadowTex)
      p.i('uShadow', 5)
    }
    const setBodies = (p) => {
      p.i('uTex', this.texSize)
      p.i('uNBig', this.nBig)
      p.i('uNMid', this.nMid)
      this.bind2D(0, posT)
      this.bind2D(1, velT)
      p.i('uPosT', 0)
      p.i('uVelT', 1)
    }

    // ---- 3. opaque scene: cyclorama + big cubes -> HDR color(+coc) / dist
    gl.bindFramebuffer(gl.FRAMEBUFFER, tg.sceneFbo)
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
    gl.viewport(0, 0, W, H)
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0])
    gl.clearBufferfv(gl.COLOR, 1, [60, 0, 0, 1])
    gl.clearBufferfv(gl.DEPTH, 0, [1])
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.depthMask(true)
    {
      const p = this.pCyc.use()
      p.m4('uVP', vp)
      setLight(p)
      p.f('uCycFall', tn.cycFall)
      gl.bindVertexArray(this.cycVao)
      gl.drawElements(gl.TRIANGLES, this.cycCount, gl.UNSIGNED_SHORT, 0)
    }
    {
      const p = this.pCube.use()
      p.m4('uVP', vp)
      setLight(p)
      setBodies(p)
      gl.enable(gl.CULL_FACE)
      gl.bindVertexArray(this.cubeVao)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, this.nBig)
      gl.disable(gl.CULL_FACE)
    }
    gl.bindVertexArray(this.emptyVao)
    gl.disable(gl.DEPTH_TEST)

    // ---- 4. volumetric haze + beam (half res)
    gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fogFbo)
    gl.viewport(0, 0, tg.fw, tg.fh)
    {
      const p = this.pFog.use()
      setLight(p)
      this.bind2D(0, tg.distTex)
      p.i('uDist', 0)
      p.v3('uRight', right)
      p.v3('uUp', up)
      p.v3('uFwd', fwd)
      p.f('uTanH', tanH)
      p.f('uAspect', aspect)
      p.f('uTime', s.t)
      p.f('uHaze', tn.haze)
      p.v2('uScaleInv', W / tg.fw, H / tg.fh)
      this.fullscreen()
    }

    // ---- 5. gather DOF (+ fog) into dof target
    gl.bindFramebuffer(gl.FRAMEBUFFER, tg.dofFbo)
    gl.viewport(0, 0, W, H)
    {
      const p = this.pDof.use()
      this.bind2D(0, tg.sceneTex)
      this.bind2D(1, tg.fogTex)
      p.i('uScene', 0)
      p.i('uFog', 1)
      p.v2('uRes', W, H)
      p.f('uMaxCoc', maxCoc)
      this.fullscreen()
    }

    // ---- 6. motion-blurred bokeh streaks + bulb (additive, depth tested)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    {
      const p = this.pSprite.use()
      p.m4('uVP', vp)
      setLight(p)
      setBodies(p)
      p.f('uFocalPx', focalPx)
      p.f('uPxMax', maxCoc * 2)
      p.v2('uRes', W, H)
      p.f('uShutter', tn.shutter)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.N - this.nBig)
    }
    {
      const p = this.pBulb.use()
      p.m4('uVP', vp)
      setLight(p)
      p.f('uFocalPx', focalPx)
      p.f('uPxMax', maxCoc * 2)
      gl.drawArrays(gl.POINTS, 0, 1)
    }
    gl.disable(gl.BLEND)
    gl.depthMask(true)
    gl.disable(gl.DEPTH_TEST)

    // ---- 7. bloom chain
    {
      const B = tg.bloom
      const pd = this.pDown.use()
      pd.f('uThr', 0.9)
      pd.f('uKnee', 0.6)
      for (let i = 0; i < B.length; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B[i].fbo)
        gl.viewport(0, 0, B[i].w, B[i].h)
        this.bind2D(0, i === 0 ? tg.dofTex : B[i - 1].tex)
        pd.i('uSrc', 0)
        pd.f('uFirst', i === 0 ? 1 : 0)
        this.fullscreen()
      }
      const pu = this.pUp.use()
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      for (let i = B.length - 1; i >= 1; i--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B[i - 1].fbo)
        gl.viewport(0, 0, B[i - 1].w, B[i - 1].h)
        this.bind2D(0, B[i].tex)
        pu.i('uSrc', 0)
        pu.f('uW', 0.9)
        this.fullscreen()
      }
      gl.disable(gl.BLEND)
    }

    // ---- 8. composite to screen
    const luv = project(vp, s.light)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, W, H)
    {
      const p = this.pComp.use()
      this.bind2D(0, tg.dofTex)
      this.bind2D(1, tg.bloom[0].tex)
      this.bind2D(2, tg.bloom[2].tex)
      p.i('uBase', 0)
      p.i('uBloom', 1)
      p.i('uBloomWide', 2)
      p.v2('uRes', W, H)
      p.f('uTime', s.t)
      p.f('uExposure', tn.exposure)
      p.f('uBloomK', tn.bloomK)
      p.v2('uLightUv', luv[0], luv[1])
      p.f('uAspect', aspect)
      p.f('uShimmer', tn.shimmer * s.intro)
      p.f('uLift', tn.lift)
      p.f('uShockT', s.shockT)
      p.f('uShockAmp', s.shockAmp)
      this.fullscreen()
    }
  }

  // diagnostics: particle + air state summary (reads back GPU textures)
  debugStats() {
    const gl = this.gl
    const T = this.texSize
    const buf = new Float32Array(T * T * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simFbo[this.cur])
    gl.readBuffer(gl.COLOR_ATTACHMENT0)
    gl.readPixels(0, 0, T, T, gl.RGBA, gl.FLOAT, buf)
    let nan = 0
    const mean = [0, 0, 0]
    let maxR = 0
    for (let i = 0; i < T * T; i++) {
      const x = buf[i * 4]
      const y = buf[i * 4 + 1]
      const z = buf[i * 4 + 2]
      if (!(isFinite(x) && isFinite(y) && isFinite(z))) {
        nan++
        continue
      }
      mean[0] += x
      mean[1] += y
      mean[2] += z
      maxR = Math.max(maxR, Math.hypot(x, y, z))
    }
    const n = Math.max(1, T * T - nan)
    const ab = new Float32Array(G_W * G_H * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.air.vel[this.air.cur].fbo)
    gl.readBuffer(gl.COLOR_ATTACHMENT0)
    gl.readPixels(0, 0, G_W, G_H, gl.RGBA, gl.FLOAT, ab)
    let airMax = 0
    let airSum = 0
    let airNan = 0
    for (let i = 0; i < G_W * G_H; i++) {
      const sp = Math.hypot(ab[i * 4], ab[i * 4 + 1], ab[i * 4 + 2])
      if (!isFinite(sp)) {
        airNan++
        continue
      }
      airMax = Math.max(airMax, sp)
      airSum += sp
    }
    return {
      nan,
      mean: mean.map((m) => m / n),
      maxR,
      light: this.state.light,
      airMax,
      airMean: airSum / (G_W * G_H),
      airNan,
    }
  }

  // dynamic resolution: back off when slow, creep back up when fast
  adapt(dtRaw) {
    if (this.opts.fixedScale || this.state.t < 2.5) return
    this.ema += (dtRaw - this.ema) * 0.05
    if (this.ema > 1 / 36) {
      this.slowFrames++
      this.fastFrames = 0
    } else if (this.ema < 1 / 56) {
      this.fastFrames++
      this.slowFrames = 0
    } else {
      this.slowFrames = 0
      this.fastFrames = 0
    }
    if (this.slowFrames > 45 && this.scale > 0.5) {
      this.scale = Math.max(0.5, this.scale - 0.1)
      this.slowFrames = 0
    } else if (this.fastFrames > 300 && this.scale < 1) {
      this.scale = Math.min(1, this.scale + 0.05)
      this.fastFrames = 0
    }
  }
}
