<template>
  <div class="book">
    <div class="book__head">
      <span>Price</span>
      <span>Size</span>
      <span>Total</span>
    </div>
    <div class="book__side book__side--ask">
      <div v-for="(lvl, i) in asks" :key="'a' + i" class="book__row">
        <span
          class="book__bar book__bar--ask"
          :style="{ width: lvl.pct + '%' }"
        />
        <span class="book__price is-ask">{{ lvl.price.toFixed(2) }}</span>
        <span class="book__size">{{ lvl.size }}</span>
        <span class="book__total">{{ lvl.total }}</span>
      </div>
    </div>
    <div class="book__mid">
      <span class="book__mid-price">{{ mid > 0 ? mid.toFixed(2) : '—' }}</span>
      <span class="book__mid-label">MID</span>
    </div>
    <div class="book__side book__side--bid">
      <div v-for="(lvl, i) in bids" :key="'b' + i" class="book__row">
        <span
          class="book__bar book__bar--bid"
          :style="{ width: lvl.pct + '%' }"
        />
        <span class="book__price is-bid">{{ lvl.price.toFixed(2) }}</span>
        <span class="book__size">{{ lvl.size }}</span>
        <span class="book__total">{{ lvl.total }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

interface Level {
  price: number
  size: number
  total: number
  pct: number
}

const DEPTH = 8

export default Vue.extend({
  name: 'OrderBook',
  props: {
    bid: { type: Number, default: 0 },
    ask: { type: Number, default: 0 },
    tickSize: { type: Number, default: 0.01 },
    seed: { type: Number, default: 0 },
  },
  computed: {
    mid(): number {
      return this.bid > 0 && this.ask > 0 ? (this.bid + this.ask) / 2 : 0
    },
    asks(): Level[] {
      return this.buildSide(1).reverse()
    },
    bids(): Level[] {
      return this.buildSide(-1)
    },
  },
  methods: {
    // Synthesize a plausible depth ladder around the top-of-book quote.
    buildSide(direction: number): Level[] {
      const base = direction > 0 ? this.ask : this.bid
      if (base <= 0) return []
      const levels: Level[] = []
      let total = 0
      for (let i = 0; i < DEPTH; i++) {
        const price = base + direction * this.tickSize * i
        const pseudo = Math.abs(
          Math.sin(this.seed * 0.13 + i * 1.7 + direction)
        )
        const size = Math.round(20 + pseudo * 480)
        total += size
        levels.push({ price, size, total, pct: 0 })
      }
      const maxTotal = levels[levels.length - 1].total || 1
      levels.forEach((l) => (l.pct = Math.round((l.total / maxTotal) * 100)))
      return levels
    },
  },
})
</script>

<style scoped>
.book {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.78rem;
}
.book__head {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  color: #64748b;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  padding: 0 8px 6px;
}
.book__head span:nth-child(2),
.book__head span:nth-child(3) {
  text-align: right;
}
.book__row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 3px 8px;
}
.book__bar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  opacity: 0.14;
}
.book__bar--ask {
  background: #fb7185;
}
.book__bar--bid {
  background: #2dd4bf;
}
.book__price {
  position: relative;
}
.is-ask {
  color: #fb7185;
}
.is-bid {
  color: #2dd4bf;
}
.book__size,
.book__total {
  position: relative;
  text-align: right;
  color: #cbd5e1;
}
.book__total {
  color: #64748b;
}
.book__mid {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid rgba(120, 140, 180, 0.12);
  border-bottom: 1px solid rgba(120, 140, 180, 0.12);
  margin: 4px 0;
}
.book__mid-price {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e2e8f0;
}
.book__mid-label {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: #64748b;
}
</style>
