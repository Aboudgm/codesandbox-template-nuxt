<template>
  <div class="ticket">
    <div class="ticket__sides">
      <button
        type="button"
        class="ticket__side"
        :class="{ 'is-buy': form.side === 'buy' }"
        @click="form.side = 'buy'"
      >
        BUY
      </button>
      <button
        type="button"
        class="ticket__side"
        :class="{ 'is-sell': form.side === 'sell' }"
        @click="form.side = 'sell'"
      >
        SELL
      </button>
    </div>

    <div class="ticket__row">
      <label class="ticket__label">Type</label>
      <div class="ticket__seg">
        <button
          type="button"
          :class="{ active: form.type === 'market' }"
          @click="form.type = 'market'"
        >
          Market
        </button>
        <button
          type="button"
          :class="{ active: form.type === 'limit' }"
          @click="form.type = 'limit'"
        >
          Limit
        </button>
      </div>
    </div>

    <div class="ticket__row">
      <label class="ticket__label" for="qty">Quantity</label>
      <input
        id="qty"
        v-model.number="form.qty"
        type="number"
        min="0"
        step="1"
      />
    </div>

    <div v-if="form.type === 'limit'" class="ticket__row">
      <label class="ticket__label" for="lp">Limit Price</label>
      <input
        id="lp"
        v-model.number="form.limitPrice"
        type="number"
        min="0"
        :step="instrument.tickSize"
      />
    </div>

    <div class="ticket__row">
      <label class="ticket__label" for="tif">TIF</label>
      <select id="tif" v-model="form.tif">
        <option value="IOC">IOC</option>
        <option value="FOK">FOK</option>
        <option value="GTC">GTC</option>
      </select>
    </div>

    <div class="ticket__preview">
      <div class="ticket__pv">
        <span>Est. Notional</span>
        <strong>{{
          risk.estimatedNotional ? risk.estimatedNotional.toFixed(2) : '—'
        }}</strong>
      </div>
      <div class="ticket__pv">
        <span>Proj. Position</span>
        <strong>{{ risk.projectedPosition }}</strong>
      </div>
    </div>

    <ul v-if="messages.length" class="ticket__msgs">
      <li v-for="(m, i) in messages" :key="i">{{ m }}</li>
    </ul>

    <button
      type="button"
      class="ticket__submit"
      :class="{
        'is-buy': form.side === 'buy',
        'is-sell': form.side === 'sell',
      }"
      :disabled="!canSubmit"
      @click="submit"
    >
      {{ form.side === 'buy' ? 'Submit Buy' : 'Submit Sell' }}
    </button>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import {
  Instrument,
  OrderRequest,
  RiskCheckResult,
  RiskLimits,
  Side,
  TimeInForce,
  ValidationResult,
} from '~/types/trading'
import { validateOrderRequest } from '~/utils/validation'
import { evaluateOrder } from '~/utils/risk'

export default Vue.extend({
  name: 'OrderTicket',
  props: {
    instrument: { type: Object as PropType<Instrument>, required: true },
    mid: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    limits: { type: Object as PropType<RiskLimits>, required: true },
  },
  data() {
    return {
      form: {
        side: 'buy' as Side,
        type: 'market' as 'market' | 'limit',
        qty: 100,
        limitPrice: null as number | null,
        tif: 'IOC' as TimeInForce,
      },
    }
  },
  computed: {
    candidate(): OrderRequest {
      return {
        symbol: this.instrument.symbol,
        side: this.form.side,
        type: this.form.type,
        qty: Number(this.form.qty),
        limitPrice:
          this.form.type === 'limit' ? Number(this.form.limitPrice) : null,
        tif: this.form.tif,
      }
    },
    validation(): ValidationResult<OrderRequest> {
      return validateOrderRequest(this.candidate)
    },
    risk(): RiskCheckResult {
      if (!this.validation.valid || this.validation.value == null) {
        return {
          ok: false,
          violations: [],
          estimatedNotional: 0,
          projectedPosition: this.position,
        }
      }
      return evaluateOrder(
        this.validation.value,
        {
          mid: this.mid,
          currentPosition: this.position,
          instrument: this.instrument,
        },
        this.limits
      )
    },
    messages(): string[] {
      return [
        ...this.validation.errors.map((e) => `${e.field}: ${e.message}`),
        ...this.risk.violations.map((v) => v.message),
      ]
    },
    canSubmit(): boolean {
      return this.validation.valid && this.risk.ok && this.mid > 0
    },
  },
  methods: {
    submit() {
      if (!this.canSubmit || this.validation.value == null) return
      this.$emit('submit', this.validation.value)
    },
  },
})
</script>

<style scoped>
.ticket {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ticket__sides {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ticket__side {
  padding: 10px;
  border: 1px solid rgba(120, 140, 180, 0.2);
  border-radius: 8px;
  background: #0e1726;
  color: #94a3b8;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ticket__side.is-buy {
  background: rgba(45, 212, 191, 0.15);
  border-color: #2dd4bf;
  color: #2dd4bf;
}
.ticket__side.is-sell {
  background: rgba(251, 113, 133, 0.15);
  border-color: #fb7185;
  color: #fb7185;
}
.ticket__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ticket__label {
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: #94a3b8;
}
.ticket input,
.ticket select {
  flex: 1;
  max-width: 160px;
  padding: 8px 10px;
  background: #0a111d;
  border: 1px solid rgba(120, 140, 180, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-family: 'Roboto Mono', monospace;
}
.ticket__seg {
  display: flex;
  border: 1px solid rgba(120, 140, 180, 0.2);
  border-radius: 8px;
  overflow: hidden;
}
.ticket__seg button {
  padding: 8px 14px;
  background: #0a111d;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}
.ticket__seg button.active {
  background: rgba(96, 165, 250, 0.18);
  color: #93c5fd;
}
.ticket__preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ticket__pv {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: #0a111d;
  border-radius: 8px;
}
.ticket__pv span {
  font-size: 0.65rem;
  color: #64748b;
  letter-spacing: 0.06em;
}
.ticket__pv strong {
  font-family: 'Roboto Mono', monospace;
  color: #e2e8f0;
}
.ticket__msgs {
  margin: 0;
  padding: 10px 12px 10px 26px;
  list-style: disc;
  background: rgba(251, 113, 133, 0.08);
  border: 1px solid rgba(251, 113, 133, 0.3);
  border-radius: 8px;
  color: #fda4af;
  font-size: 0.74rem;
}
.ticket__submit {
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  color: #04111a;
}
.ticket__submit.is-buy {
  background: #2dd4bf;
}
.ticket__submit.is-sell {
  background: #fb7185;
}
.ticket__submit:disabled {
  background: #1e293b;
  color: #475569;
  cursor: not-allowed;
}
</style>
