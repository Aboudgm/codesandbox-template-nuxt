<template>
  <div class="light-room">
    <canvas
      ref="canvas"
      class="light-room__canvas"
      @pointermove="onMove"
      @pointerdown="onDown"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onUp"
      @contextmenu.prevent
    />
    <p v-if="failure" class="light-room__fallback">{{ failure }}</p>
  </div>
</template>

<script>
import { LightRoom } from '~/utils/lightroom/engine'

export default {
  name: 'LightRoom',
  data() {
    return { failure: '' }
  },
  mounted() {
    this.boot()
    document.addEventListener('visibilitychange', this.onVisibility)
  },
  beforeDestroy() {
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.teardown()
  },
  methods: {
    boot() {
      this.teardown()
      const q = new URLSearchParams(window.location.search)
      const opts = {
        onLost: () => this.teardown(),
        onRestored: () => this.boot(),
        onError: (e) => this.fail(e),
      }
      if (q.get('n')) opts.tex = parseInt(q.get('n'), 10)
      if (q.get('scale')) {
        opts.scale = parseFloat(q.get('scale'))
        opts.fixedScale = true
      }
      try {
        this.engine = new LightRoom(this.$refs.canvas, opts)
        this.engine.start()
        if (process.env.NODE_ENV !== 'production') {
          window.__lightRoom = this.engine // dev tuning/debug handle
        }
      } catch (e) {
        this.fail(e)
      }
    },
    fail(e) {
      // eslint-disable-next-line no-console
      console.error('[LightRoom]', e)
      this.failure = 'This scene needs WebGL2 with float render targets.'
      this.teardown()
    },
    teardown() {
      if (this.engine) {
        this.engine.dispose()
        this.engine = null
      }
    },
    onVisibility() {
      if (!this.engine) return
      if (document.hidden) this.engine.stop()
      else this.engine.start()
    },
    ndc(e) {
      const r = this.$refs.canvas.getBoundingClientRect()
      return [
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -(((e.clientY - r.top) / r.height) * 2 - 1),
      ]
    },
    onMove(e) {
      if (!this.engine) return
      const [x, y] = this.ndc(e)
      this.engine.setPointer(x, y)
    },
    onDown(e) {
      if (!this.engine) return
      this.$refs.canvas.setPointerCapture(e.pointerId)
      const [x, y] = this.ndc(e)
      this.engine.setPointer(x, y)
      this.engine.setHold(true)
    },
    onUp() {
      if (this.engine) this.engine.setHold(false)
    },
  },
}
</script>

<style scoped>
.light-room {
  --room-bg: #000;
  --room-fg: #8a8a8a;
  position: fixed;
  inset: 0;
  background: var(--room-bg);
  overflow: hidden;
}

.light-room__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: none;
}

.light-room__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 16px;
  color: var(--room-fg);
  font-family: sans-serif;
  text-align: center;
}
</style>
