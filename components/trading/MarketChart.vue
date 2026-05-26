<template>
  <div ref="wrap" class="chart-wrap">
    <canvas ref="canvas" class="chart-canvas" />
    <div class="chart-meta">
      <span class="chart-meta__label">{{ symbol }}</span>
      <span class="chart-meta__points">{{ ticks.length }} pts</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { Tick } from '~/types/trading'

export default Vue.extend({
  name: 'MarketChart',
  props: {
    symbol: { type: String, required: true },
    ticks: { type: Array as PropType<Tick[]>, default: () => [] },
  },
  data() {
    return {
      raf: 0,
      dpr: 1,
    }
  },
  mounted() {
    this.dpr = window.devicePixelRatio || 1
    this.resize()
    window.addEventListener('resize', this.resize)
    const loop = () => {
      this.draw()
      this.raf = window.requestAnimationFrame(loop)
    }
    this.raf = window.requestAnimationFrame(loop)
  },
  beforeDestroy() {
    window.cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
  },
  methods: {
    resize() {
      const wrap = this.$refs.wrap as HTMLElement
      const canvas = this.$refs.canvas as HTMLCanvasElement
      if (!wrap || !canvas) return
      canvas.width = wrap.clientWidth * this.dpr
      canvas.height = wrap.clientHeight * this.dpr
    },
    draw() {
      const canvas = this.$refs.canvas as HTMLCanvasElement
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // Grid.
      ctx.strokeStyle = 'rgba(120, 140, 180, 0.10)'
      ctx.lineWidth = 1
      for (let i = 1; i < 5; i++) {
        const y = (h / 5) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      const prices = this.ticks.map((t) => t.last)
      if (prices.length < 2) return

      let min = Math.min(...prices)
      let max = Math.max(...prices)
      if (min === max) {
        min -= 1
        max += 1
      }
      const pad = (max - min) * 0.1
      min -= pad
      max += pad

      const xStep = w / (prices.length - 1)
      const toY = (p: number) => h - ((p - min) / (max - min)) * h

      const rising = prices[prices.length - 1] >= prices[0]
      const line = rising ? '#2dd4bf' : '#fb7185'

      // Area fill.
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(
        0,
        rising ? 'rgba(45,212,191,0.28)' : 'rgba(251,113,133,0.28)'
      )
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.moveTo(0, h)
      prices.forEach((p, i) => ctx.lineTo(i * xStep, toY(p)))
      ctx.lineTo((prices.length - 1) * xStep, h)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // Price line.
      ctx.beginPath()
      prices.forEach((p, i) => {
        const x = i * xStep
        const y = toY(p)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = line
      ctx.lineWidth = 2 * this.dpr
      ctx.stroke()

      // Last-price marker.
      const lastX = (prices.length - 1) * xStep
      const lastY = toY(prices[prices.length - 1])
      ctx.beginPath()
      ctx.arc(lastX, lastY, 4 * this.dpr, 0, Math.PI * 2)
      ctx.fillStyle = line
      ctx.fill()
    },
  },
})
</script>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 260px;
}
.chart-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.chart-meta {
  position: absolute;
  top: 10px;
  left: 12px;
  display: flex;
  gap: 12px;
  align-items: baseline;
  pointer-events: none;
}
.chart-meta__label {
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #e2e8f0;
}
.chart-meta__points {
  font-size: 0.7rem;
  color: #64748b;
  font-family: 'Roboto Mono', monospace;
}
</style>
