<template>
  <div class="risk">
    <div class="risk__top">
      <button
        type="button"
        class="risk__kill"
        :class="{ engaged: limits.killSwitch }"
        @click="$emit('toggle-kill')"
      >
        <span class="risk__kill-dot" />
        {{ limits.killSwitch ? 'HALTED' : 'ARMED' }}
      </button>
      <span class="risk__rejections">{{ rejections }} rejected</span>
    </div>

    <div class="risk__stats">
      <div class="risk__stat">
        <span>Position</span>
        <strong :class="positionTone">{{ position }}</strong>
      </div>
      <div class="risk__stat">
        <span>Avg Price</span>
        <strong>{{ avgPrice > 0 ? avgPrice.toFixed(2) : '—' }}</strong>
      </div>
      <div class="risk__stat">
        <span>Realized P&L</span>
        <strong :class="pnlTone(realizedPnl)">{{
          realizedPnl.toFixed(2)
        }}</strong>
      </div>
      <div class="risk__stat">
        <span>Unrealized P&L</span>
        <strong :class="pnlTone(unrealizedPnl)">{{
          unrealizedPnl.toFixed(2)
        }}</strong>
      </div>
    </div>

    <div class="risk__limits">
      <div class="risk__limit">
        <span>Position usage</span>
        <div class="risk__meter">
          <span
            class="risk__meter-fill"
            :style="{ width: positionUsage + '%' }"
            :class="{ hot: positionUsage > 80 }"
          />
        </div>
        <small>{{ Math.abs(position) }} / {{ limits.maxPosition }}</small>
      </div>
      <ul class="risk__config">
        <li>
          <span>Max order qty</span><b>{{ limits.maxOrderQty }}</b>
        </li>
        <li>
          <span>Max notional</span
          ><b>{{ limits.maxNotional.toLocaleString() }}</b>
        </li>
        <li>
          <span>Price collar</span><b>{{ limits.priceCollarBps }} bps</b>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { RiskLimits } from '~/types/trading'

export default Vue.extend({
  name: 'RiskMonitor',
  props: {
    limits: { type: Object as PropType<RiskLimits>, required: true },
    position: { type: Number, default: 0 },
    avgPrice: { type: Number, default: 0 },
    realizedPnl: { type: Number, default: 0 },
    unrealizedPnl: { type: Number, default: 0 },
    rejections: { type: Number, default: 0 },
  },
  computed: {
    positionTone(): string {
      if (this.position > 0) return 'is-up'
      if (this.position < 0) return 'is-down'
      return ''
    },
    positionUsage(): number {
      if (this.limits.maxPosition <= 0) return 0
      return Math.min(
        100,
        Math.round((Math.abs(this.position) / this.limits.maxPosition) * 100)
      )
    },
  },
  methods: {
    pnlTone(v: number): string {
      if (v > 0) return 'is-up'
      if (v < 0) return 'is-down'
      return ''
    },
  },
})
</script>

<style scoped>
.risk {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.risk__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.risk__kill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(45, 212, 191, 0.4);
  background: rgba(45, 212, 191, 0.12);
  color: #2dd4bf;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.risk__kill.engaged {
  border-color: rgba(251, 113, 133, 0.5);
  background: rgba(251, 113, 133, 0.14);
  color: #fb7185;
}
.risk__kill-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.risk__rejections {
  font-size: 0.72rem;
  color: #64748b;
  font-family: 'Roboto Mono', monospace;
}
.risk__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.risk__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: #0a111d;
  border-radius: 8px;
}
.risk__stat span {
  font-size: 0.65rem;
  color: #64748b;
  letter-spacing: 0.05em;
}
.risk__stat strong {
  font-family: 'Roboto Mono', monospace;
  font-size: 1rem;
  color: #e2e8f0;
}
.risk__meter {
  height: 6px;
  border-radius: 3px;
  background: rgba(120, 140, 180, 0.15);
  overflow: hidden;
  margin: 6px 0;
}
.risk__meter-fill {
  display: block;
  height: 100%;
  background: #60a5fa;
}
.risk__meter-fill.hot {
  background: #fb7185;
}
.risk__limit small {
  font-size: 0.66rem;
  color: #64748b;
  font-family: 'Roboto Mono', monospace;
}
.risk__limit > span {
  font-size: 0.65rem;
  color: #64748b;
  letter-spacing: 0.05em;
}
.risk__config {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.risk__config li {
  display: flex;
  justify-content: space-between;
  font-size: 0.74rem;
  color: #94a3b8;
}
.risk__config b {
  font-family: 'Roboto Mono', monospace;
  color: #cbd5e1;
}
.is-up {
  color: #2dd4bf;
}
.is-down {
  color: #fb7185;
}
</style>
