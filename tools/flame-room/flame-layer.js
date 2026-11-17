/* eslint-disable */
// Plain browser script, stitched into static/flame-room.html by build.py (shares globals with the room engine).
/* =====================================================================
   FlameLayer: the voice-orb flame, rendered as the room's light.
   Splats accumulate in their own square HDR buffer (temporal average),
   then the buffer is added into the room before bloom, at the light's
   screen position, hidden wherever something stands in front of it.
   Silent: audio is only ever analysed.
   ===================================================================== */
const FLAME_OVERLAY_VS = `#version 300 es
uniform vec2 uC;
uniform vec2 uHalf;
out vec2 vUv;
const vec2 K[6] = vec2[6](vec2(-1.,-1.), vec2(1.,-1.), vec2(1.,1.), vec2(-1.,-1.), vec2(1.,1.), vec2(-1.,1.));
void main(){ vec2 k = K[gl_VertexID]; vUv = k*.5 + .5; gl_Position = vec4(uC + k*uHalf, 0., 1.); }`;

const FLAME_OVERLAY_FS = `#version 300 es
precision highp float;
uniform sampler2D uFlame;
uniform sampler2D uDist;
uniform float uGamma, uExpo, uGain, uLightDist;
uniform vec3 uTint;
in vec2 vUv;
out vec4 o;
void main(){
  vec3 c = texture(uFlame, vUv).rgb;
  c = pow(max(c*uExpo, 0.), vec3(uGamma)) * uGain * uTint;      // density -> light: folds pop, veil sinks
  float sd = texelFetch(uDist, ivec2(gl_FragCoord.xy), 0).r;    // what the room has at this pixel
  float vis = smoothstep(uLightDist - .45, uLightDist - .05, sd); // a cube in front hides the flame
  vec2 e = smoothstep(0., .1, vUv) * smoothstep(0., .1, 1. - vUv);
  o = vec4(c * vis * e.x * e.y, 0.);
}`;

class FlameMeter {
  // analyse only; never connected to speakers
  constructor(ctx, node, pull) {
    this.an = ctx.createAnalyser();
    this.an.fftSize = 1024;
    this.an.smoothingTimeConstant = 0.6;
    node.connect(this.an);
    this.node = node;
    if (pull) {
      this.sink = ctx.createGain();
      this.sink.gain.value = 0;
      this.an.connect(this.sink);
      this.sink.connect(ctx.destination);
    }
    this.t = new Float32Array(this.an.fftSize);
    this.f = new Uint8Array(this.an.frequencyBinCount);
    this.peak = 0.05;
    this.open = false;
    this.sr = ctx.sampleRate;
  }
  read(dt) {
    this.an.getFloatTimeDomainData(this.t);
    let s = 0;
    for (let i = 0; i < this.t.length; i++) s += this.t[i] * this.t[i];
    const rms = Math.sqrt(s / this.t.length);
    this.peak = Math.max(rms, this.peak * Math.exp(-dt / 6), 0.015); // AGC: slow-decay peak
    const x = Math.min(1, rms / this.peak);
    if (!this.open && x > 0.18 && rms > 0.003) this.open = true;
    // hysteresis gate
    else if (this.open && (x < 0.09 || rms < 0.002)) this.open = false;
    const level = this.open ? Math.pow(x, 0.8) : 0;
    this.an.getByteFrequencyData(this.f);
    let num = 0,
      den = 0,
      low = 0;
    const bw = this.sr / this.an.fftSize;
    for (let i = 2; i < this.f.length; i++) {
      const v = this.f[i];
      num += i * bw * v;
      den += v;
      if (i * bw < 250) low += v;
    }
    return {
      level,
      pitch: Math.min(1, Math.max(0, ((den ? num / den : 0) - 200) / 2800)),
      bass: den ? Math.min(1, (low / den) * 2.2) * level : 0,
    };
  }
  close() {
    try {
      this.node.disconnect(this.an);
      this.an.disconnect();
      if (this.sink) this.sink.disconnect();
    } catch (e) {}
  }
}

class FlameLayer {
  constructor(room, opts = {}) {
    const gl = (this.gl = room.gl);
    this.room = room;
    const mobile = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
    this.S = opts.size || (mobile ? 384 : 512);
    this.N = opts.particles || (mobile ? 90000 : 200000);
    this.STATES = ["idle", "listening", "thinking", "speaking"];
    this.SP = {
      idle: {
        tau: 0.13,
        gamma: 1.95,
        expo: 1.15,
        fold: 0.17,
        flow: 0.1,
        disp: 0.03,
        ring: 1.1,
        arc: 0.45,
        lat: 0.45,
        twist: 0.0,
        light: 0.85,
        tint: [1.0, 0.95, 0.86],
        hold: 0.0,
        swirl: 1.0,
      },
      listening: {
        tau: 0.16,
        gamma: 1.8,
        expo: 1.05,
        fold: 0.23,
        flow: 0.18,
        disp: 0.05,
        ring: 1.4,
        arc: 0.7,
        lat: 0.5,
        twist: 0.0,
        light: 1.0,
        tint: [1.0, 0.97, 0.93],
        hold: 0.22,
        swirl: 1.2,
      },
      thinking: {
        tau: 0.22,
        gamma: 1.85,
        expo: 1.1,
        fold: 0.19,
        flow: 0.13,
        disp: 0.035,
        ring: 2.8,
        arc: 0.6,
        lat: 1.25,
        twist: 1.8,
        light: 0.9,
        tint: [0.8, 0.9, 1.12],
        hold: 0.08,
        swirl: 2.4,
      },
      speaking: {
        tau: 0.18,
        gamma: 1.7,
        expo: 1.0,
        fold: 0.34,
        flow: 0.27,
        disp: 0.07,
        ring: 1.8,
        arc: 1.15,
        lat: 0.6,
        twist: 0.15,
        light: 1.1,
        tint: [1.08, 0.92, 0.76],
        hold: 0.0,
        swirl: 1.5,
      },
    };
    this.sm = JSON.parse(JSON.stringify(this.SP.idle));
    this.wts = [1, 0, 0, 0];
    this.target = "idle";
    Object.assign(this, {
      level: 0,
      pitch: 0.4,
      bass: 0,
      flow: 0,
      twist: 0,
      pulse: 0,
      shock: -1,
      lastShock: -9,
      prevLevel: 0,
      manualLevel: 0,
      manualAt: -9,
      manualPitch: null,
      rotY: 0,
      time: 0,
      frames: 0,
      ptr: [0, 0, 0],
      ctx: null,
      mic: null,
      out: null,
      micStream: null,
      demoOn: false,
      demoT: 0,
    });
    this.calm = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0.35
      : 1;

    const compile = (type, src, name) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(name + ": " + gl.getShaderInfoLog(s));
      return s;
    };
    const program = (vs, fs, name, attr) => {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs, name + " VS"));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs, name + " FS"));
      if (attr) gl.bindAttribLocation(p, 0, attr);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(name + ": " + gl.getProgramInfoLog(p));
      const U = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const a = gl.getActiveUniform(p, i);
        const k = a.name.replace(/\[0\]$/, "");
        U[k] = gl.getUniformLocation(p, a.name);
      }
      return { p, U };
    };
    this.pSplat = program(
      FLAME_SPLAT_VS,
      FLAME_SPLAT_FS,
      "flameSplat",
      "aSeed"
    );
    this.pDecay = program(FLAME_QUAD_VS, FLAME_DECAY_FS, "flameDecay", "a");
    this.pOver = program(FLAME_OVERLAY_VS, FLAME_OVERLAY_FS, "flameOverlay");

    // icosahedron: 12 vertices, 30 edges of length 2
    const f = (1 + Math.sqrt(5)) / 2,
      V = [];
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        V.push([0, a, b * f], [a, b * f, 0], [b * f, 0, a]);
    const E = [];
    for (let i = 0; i < 12; i++)
      for (let j = i + 1; j < 12; j++) {
        const d = Math.hypot(
          V[i][0] - V[j][0],
          V[i][1] - V[j][1],
          V[i][2] - V[j][2]
        );
        if (Math.abs(d - 2) < 1e-3) E.push(...V[i], ...V[j]);
      }
    this.ico = new Float32Array(E.map((x) => x / Math.hypot(1, f)));

    const seeds = new Float32Array(this.N * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    this.vaoSeeds = gl.createVertexArray();
    gl.bindVertexArray(this.vaoSeeds);
    let b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    this.vaoQuad = gl.createVertexArray();
    gl.bindVertexArray(this.vaoQuad);
    b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.vaoNone = gl.createVertexArray();
    gl.bindVertexArray(null);

    const S = this.S;
    this.acc = [0, 1].map(() => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        S,
        S,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
      for (const [k, v] of [
        [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
        [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      ])
        gl.texParameteri(gl.TEXTURE_2D, k, v);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        t,
        0
      );
      gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
      return { t, fb };
    });
    this.cur = 0;
    room.ext.hideBulb = true
    room.ext.coreScale = 0.3;
    room.ext.overlay = (c) => this.frame(c);
  }

  // ---------------------------------------------------------------- API
  setState(s) {
    if (this.STATES.includes(s) && s !== this.target) {
      this.target = s;
      if (s !== "idle") this.shock = 0.001;
      if (s === "speaking") this.room.pulse(0.3);
    }
  }
  get state() {
    return this.target;
  }
  setLevel(v) {
    this.manualLevel = Math.max(0, Math.min(1, +v || 0));
    this.manualAt = performance.now();
  }
  setPitch(v) {
    this.manualPitch = Math.max(0, Math.min(1, +v || 0));
  }
  setPointer(x, y, strength) {
    this.ptr = [x, y, strength];
  }
  demo(on) {
    this.demoOn = !!on;
    this.demoT = 0;
  }
  ensureCtx() {
    if (!this.ctx)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  async useMic() {
    if (this.mic) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const e = new Error("insecure");
      e.name = "InsecureContext";
      throw e;
    }
    this.ensureCtx();
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.mic = new FlameMeter(
      this.ctx,
      this.ctx.createMediaStreamSource(this.micStream),
      true
    );
    return true;
  }
  stopMic() {
    if (this.micStream) this.micStream.getTracks().forEach((t) => t.stop());
    if (this.mic) this.mic.close();
    this.mic = null;
    this.micStream = null;
  }
  useOutputElement(el) {
    this.ensureCtx();
    const src = this.ctx.createMediaElementSource(el);
    this.out = new FlameMeter(this.ctx, src);
    src.connect(this.ctx.destination);
  }
  useOutputStream(stream) {
    this.ensureCtx();
    const a = new Audio();
    a.muted = true;
    a.srcObject = stream;
    a.play().catch(() => {});
    this.out = new FlameMeter(
      this.ctx,
      this.ctx.createMediaStreamSource(stream),
      true
    );
  }

  static speechEnv(t) {
    const syl = Math.max(
      0,
      Math.sin(t * 7.3) * 0.6 + Math.sin(t * 3.1 + 1) * 0.4
    );
    return Math.min(
      1,
      syl * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.9))) * 1.15
    );
  }

  // ------------------------------------------------- state + room coupling
  update(dt) {
    const lerpTau = (cur, tgt, tau) =>
      cur + (tgt - cur) * (1 - Math.exp(-dt / tau));
    const now = performance.now();
    this.time += dt;
    this.frames++;
    const time = this.time;
    if (this.demoOn) {
      const D = [
        ["idle", 2.6],
        ["listening", 5.0],
        ["thinking", 3.2],
        ["speaking", 6.0],
      ];
      this.demoT += dt;
      let a = 0;
      const tot = D.reduce((s, d) => s + d[1], 0),
        tt = this.demoT % tot;
      for (const [n, l] of D) {
        if (tt < a + l) {
          if (this.target !== n) this.setState(n);
          break;
        }
        a += l;
      }
    }
    let rawLevel = 0,
      rawPitch = this.pitch,
      rawBass = 0;
    if (now - this.manualAt < 150) rawLevel = this.manualLevel;
    else if (
      this.demoOn &&
      (this.target === "listening" || this.target === "speaking")
    ) {
      rawLevel = FlameLayer.speechEnv(this.demoT);
      rawBass = rawLevel * 0.5;
    } else if (this.target === "speaking") {
      if (this.out) {
        const m = this.out.read(dt);
        rawLevel = m.level;
        rawPitch = m.pitch;
        rawBass = m.bass;
      } else {
        rawLevel = FlameLayer.speechEnv(time) * 0.85;
        rawBass = rawLevel * 0.4;
      }
    } else if (this.target === "listening" && this.mic) {
      const m = this.mic.read(dt);
      rawLevel = m.level;
      rawPitch = m.pitch;
      rawBass = m.bass;
    }
    if (this.manualPitch !== null) rawPitch = this.manualPitch;
    this.level = lerpTau(
      this.level,
      rawLevel,
      rawLevel > this.level ? 0.045 : 0.22
    );
    this.pitch = lerpTau(this.pitch, rawPitch, 0.25);
    this.bass = lerpTau(this.bass, rawBass, 0.18);
    this.STATES.forEach((s, i) => {
      this.wts[i] = lerpTau(this.wts[i], s === this.target ? 1 : 0, 0.35);
    });
    for (const k of Object.keys(this.sm)) {
      if (Array.isArray(this.sm[k]))
        this.sm[k] = [0, 1, 2].map((j) =>
          this.STATES.reduce((v, s, i) => v + this.SP[s][k][j] * this.wts[i], 0)
        );
      else
        this.sm[k] = this.STATES.reduce(
          (v, s, i) => v + this.SP[s][k] * this.wts[i],
          0
        );
    }
    this.flow += dt * (this.sm.flow + 0.3 * this.level) * this.calm;
    this.twist = lerpTau(
      this.twist,
      this.sm.twist * (1 + 0.4 * Math.sin(time * 0.7)),
      0.6
    );
    this.pulse = this.wts[2] * (0.5 + 0.5 * Math.sin(time * 5.2));
    if (this.shock >= 0) {
      this.shock += dt * 0.85;
      if (this.shock > 1) this.shock = -1;
    }
    if (
      (this.target === "listening" || this.target === "speaking") &&
      this.level - this.prevLevel > 0.1 &&
      this.level > 0.3 &&
      time - this.lastShock > 0.5
    ) {
      this.shock = 0.001;
      this.lastShock = time;
      this.room.pulse(0.18); // a phrase onset breathes on the dust
    }
    this.prevLevel = this.level;
    this.rotY += dt * 0.09 * this.calm;

    // the flame IS the room's light
    const e = this.room.ext;
    const voice = this.level * (this.wts[1] * 0.3 + this.wts[3] * 0.45);
    e.lightScale = this.sm.light * (1 + voice) * Math.min(1, time / 2.5 + 0.2);
    e.tint = this.sm.tint.map((x) => x * (1 + 0.15 * voice));
    e.holdBias = this.sm.hold * (1 + this.level);
    e.swirlScale = this.sm.swirl + 0.6 * this.level;
    e.heatScale = 1 + 0.9 * this.wts[3] * this.level;
  }

  // --------------------------------------------------------------- render
  frame(c) {
    const gl = this.gl;
    const dt = Math.min(c.dt, 1 / 20);
    this.update(dt);
    const S = this.S,
      sm = this.sm;
    const decay = Math.exp(-dt / sm.tau);
    const src = this.acc[this.cur],
      dst = this.acc[1 - this.cur];

    // where the light lands on screen, and how big the flame is there
    const vp = c.vp,
      L = c.light;
    const cx = vp[0] * L[0] + vp[4] * L[1] + vp[8] * L[2] + vp[12];
    const cy = vp[1] * L[0] + vp[5] * L[1] + vp[9] * L[2] + vp[13];
    const cw = Math.max(
      vp[3] * L[0] + vp[7] * L[1] + vp[11] * L[2] + vp[15],
      0.2
    );
    const worldHalf = 0.75; // half-width of the flame's square, world units
    const halfPx = (worldHalf * c.focalPx) / cw;
    const half = [halfPx / (c.W / 2), halfPx / (c.H / 2)];
    const center = [cx / cw, cy / cw];
    // pointer relative to the flame's own square
    const pl = [
      (this.ptr[0] - center[0]) / half[0],
      (this.ptr[1] - center[1]) / half[1],
    ];

    // 1) temporal average
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, S, S);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.pDecay.p);
    gl.bindVertexArray(this.vaoQuad);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.t);
    gl.uniform1i(this.pDecay.U.uTex, 0);
    gl.uniform1f(this.pDecay.U.uDecay, decay);
    gl.uniform1f(this.pDecay.U.uFloor, 0.0002);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 2) additive splats; energy ~ (1-decay)*S^2/N
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const U = this.pSplat.U;
    gl.useProgram(this.pSplat.p);
    gl.bindVertexArray(this.vaoSeeds);
    gl.uniform2f(U.uRes, S, S);
    gl.uniform1f(U.uPx, 1);
    gl.uniform1f(U.uE, (((1 - decay) * S * S) / this.N) * 0.055);
    gl.uniform1f(U.uTime, this.time * this.calm);
    gl.uniform1f(U.uFlow, this.flow);
    gl.uniform1f(U.uTwist, this.twist);
    gl.uniform1f(U.uFold, sm.fold * (1 + 0.9 * this.level));
    gl.uniform1f(U.uDisp, sm.disp + 0.04 * this.level);
    gl.uniform1f(U.uLevel, this.level);
    gl.uniform1f(U.uPitch, this.pitch);
    gl.uniform1f(U.uBass, this.bass);
    gl.uniform1f(U.uListen, this.wts[1]);
    gl.uniform1f(U.uThink, this.wts[2]);
    gl.uniform1f(U.uSpeak, this.wts[3]);
    gl.uniform1f(U.uBirth, this.calm < 1 ? 1 : Math.min(1, this.time / 3.0));
    gl.uniform1f(U.uShock, this.shock);
    gl.uniform1f(U.uZoom, 1.85);
    gl.uniform1f(U.uBob, 0);
    gl.uniform1f(U.uRing, sm.ring);
    gl.uniform1f(U.uArc, sm.arc);
    gl.uniform1f(U.uLat, sm.lat);
    gl.uniform1f(U.uPulse, this.pulse);
    gl.uniform2f(U.uRot, 0.12, this.rotY);
    gl.uniform3f(
      U.uPtr,
      pl[0],
      pl[1],
      this.ptr[2] * (Math.abs(pl[0]) < 1.2 && Math.abs(pl[1]) < 1.2 ? 1 : 0)
    );
    gl.uniform3fv(U.uIco, this.ico);
    gl.drawArrays(gl.POINTS, 0, this.N);

    // 3) add it into the room, before bloom, hidden behind whatever is in front
    const tg = c.targets;
    gl.bindFramebuffer(gl.FRAMEBUFFER, tg.dofFbo);
    gl.viewport(0, 0, c.W, c.H);
    gl.useProgram(this.pOver.p);
    gl.bindVertexArray(this.vaoNone);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dst.t);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tg.distTex);
    gl.activeTexture(gl.TEXTURE0);
    const O = this.pOver.U;
    gl.uniform1i(O.uFlame, 0);
    gl.uniform1i(O.uDist, 1);
    gl.uniform2f(O.uC, center[0], center[1]);
    gl.uniform2f(O.uHalf, half[0], half[1]);
    gl.uniform1f(O.uGamma, sm.gamma);
    gl.uniform1f(O.uExpo, sm.expo);
    gl.uniform1f(
      O.uGain,
      (7 * this.room.ext.lightScale) / Math.max(sm.light, 0.1)
    );
    gl.uniform1f(
      O.uLightDist,
      Math.hypot(L[0] - c.eye[0], L[1] - c.eye[1], L[2] - c.eye[2])
    );
    gl.uniform3f(O.uTint, 1, 1, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.cur = 1 - this.cur;
  }
}
