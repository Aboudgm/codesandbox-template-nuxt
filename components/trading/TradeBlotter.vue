<template>
  <div class="blotter">
    <div class="blotter__head">
      <span>Time</span>
      <span>Side</span>
      <span>Qty</span>
      <span>Price</span>
      <span>Notional</span>
    </div>
    <div class="blotter__body">
      <p v-if="executions.length === 0" class="blotter__empty">
        No executions yet.
      </p>
      <div v-for="ex in executions" :key="ex.id" class="blotter__row">
        <span class="blotter__time">{{ formatTime(ex.ts) }}</span>
        <span :class="ex.side === 'buy' ? 'is-up' : 'is-down'">{{
          ex.side.toUpperCase()
        }}</span>
        <span>{{ ex.qty }}</span>
        <span>{{ ex.price.toFixed(2) }}</span>
        <span>{{ ex.notional.toFixed(0) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { Execution } from '~/types/trading'

export default Vue.extend({
  name: 'TradeBlotter',
  props: {
    executions: { type: Array as PropType<Execution[]>, default: () => [] },
  },
  methods: {
    formatTime(ts: number): string {
      const d = new Date(ts)
      return d.toLocaleTimeString('en-GB', { hour12: false })
    },
  },
})
</script>

<style scoped>
.blotter {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.76rem;
}
.blotter__head,
.blotter__row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr 1fr 1fr;
  gap: 8px;
  padding: 5px 8px;
}
.blotter__head {
  color: #64748b;
  font-size: 0.64rem;
  letter-spacing: 0.06em;
  border-bottom: 1px solid rgba(120, 140, 180, 0.12);
}
.blotter__body {
  max-height: 220px;
  overflow-y: auto;
}
.blotter__row {
  color: #cbd5e1;
  border-bottom: 1px solid rgba(120, 140, 180, 0.06);
}
.blotter__time {
  color: #64748b;
}
.blotter__empty {
  padding: 16px 8px;
  color: #475569;
  font-style: italic;
}
.is-up {
  color: #2dd4bf;
}
.is-down {
  color: #fb7185;
}
</style>
