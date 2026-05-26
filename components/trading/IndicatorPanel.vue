<template>
  <div class="indicators">
    <div v-for="item in items" :key="item.label" class="indicators__cell">
      <span class="indicators__label">{{ item.label }}</span>
      <span class="indicators__value" :class="item.tone">{{
        item.display
      }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'

interface IndicatorItem {
  label: string
  display: string
  tone: string
}

export default Vue.extend({
  name: 'IndicatorPanel',
  props: {
    last: { type: Number, default: null },
    smaValue: { type: Number as PropType<number | null>, default: null },
    emaValue: { type: Number as PropType<number | null>, default: null },
    rsiValue: { type: Number as PropType<number | null>, default: null },
    vwapValue: { type: Number as PropType<number | null>, default: null },
    volatility: { type: Number as PropType<number | null>, default: null },
    spread: { type: Number as PropType<number | null>, default: null },
  },
  computed: {
    items(): IndicatorItem[] {
      const fmt = (v: number | null, dp = 2) =>
        v == null || Number.isNaN(v) ? '—' : v.toFixed(dp)
      let rsiTone = ''
      if (this.rsiValue != null) {
        if (this.rsiValue >= 70) rsiTone = 'is-down'
        else if (this.rsiValue <= 30) rsiTone = 'is-up'
      }
      return [
        { label: 'LAST', display: fmt(this.last), tone: '' },
        { label: 'SMA(20)', display: fmt(this.smaValue), tone: '' },
        { label: 'EMA(12)', display: fmt(this.emaValue), tone: '' },
        { label: 'RSI(14)', display: fmt(this.rsiValue, 1), tone: rsiTone },
        { label: 'VWAP', display: fmt(this.vwapValue), tone: '' },
        { label: 'σ(20)', display: fmt(this.volatility, 3), tone: '' },
        { label: 'SPREAD', display: fmt(this.spread, 3), tone: '' },
      ]
    },
  },
})
</script>

<style scoped>
.indicators {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(86px, 1fr));
  gap: 1px;
  background: rgba(120, 140, 180, 0.12);
  border-radius: 10px;
  overflow: hidden;
}
.indicators__cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: #0e1726;
}
.indicators__label {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: #64748b;
}
.indicators__value {
  font-family: 'Roboto Mono', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}
.is-up {
  color: #2dd4bf;
}
.is-down {
  color: #fb7185;
}
</style>
