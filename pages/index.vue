<template>
  <div class="hub">
    <header class="hub__bar">
      <div class="hub__brand">
        <span class="hub__logo">⬡</span>
        <div>
          <h1>Algo Trading Hub</h1>
          <p>High-frequency execution deck</p>
        </div>
      </div>
      <div class="hub__quote">
        <span class="hub__symbol">{{ instrument.symbol }}</span>
        <span class="hub__last" :class="changeTone">{{ last.toFixed(2) }}</span>
        <span class="hub__chg" :class="changeTone"
          >{{ changePct >= 0 ? '+' : '' }}{{ changePct.toFixed(2) }}%</span
        >
      </div>
      <div class="hub__status">
        <button type="button" class="hub__feed" @click="toggleFeed">
          <span class="hub__feed-dot" :class="{ live: streaming }" />
          {{ streaming ? 'LIVE' : 'PAUSED' }}
        </button>
        <span class="hub__tps">{{ tickRate }} tk/s</span>
      </div>
    </header>

    <main class="hub__grid">
      <section class="panel panel--chart">
        <MarketChart :symbol="instrument.symbol" :ticks="ticks" />
        <IndicatorPanel
          :last="last"
          :sma-value="sma20"
          :ema-value="ema12"
          :rsi-value="rsi14"
          :vwap-value="vwapValue"
          :volatility="vol20"
          :spread="spread"
        />
      </section>

      <section class="panel panel--book">
        <h2 class="panel__title">Order Book</h2>
        <OrderBook
          :bid="bid"
          :ask="ask"
          :tick-size="instrument.tickSize"
          :seed="ticks.length"
        />
      </section>

      <section class="panel panel--ticket">
        <h2 class="panel__title">Order Ticket</h2>
        <OrderTicket
          :instrument="instrument"
          :mid="mid"
          :position="position"
          :limits="limits"
          @submit="onSubmit"
        />
      </section>

      <section class="panel panel--risk">
        <h2 class="panel__title">Risk Monitor</h2>
        <RiskMonitor
          :limits="limits"
          :position="position"
          :avg-price="avgPrice"
          :realized-pnl="realizedPnl"
          :unrealized-pnl="unrealizedPnl"
          :rejections="rejections"
          @toggle-kill="toggleKill"
        />
      </section>

      <section class="panel panel--blotter">
        <h2 class="panel__title">Trade Blotter</h2>
        <TradeBlotter :executions="blotter" />
      </section>
    </main>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {
  Execution,
  Instrument,
  OrderRequest,
  RiskLimits,
  Tick,
} from '~/types/trading'
import { RingBuffer } from '~/utils/ringBuffer'
import { MarketFeed } from '~/utils/marketFeed'
import { evaluateOrder } from '~/utils/risk'
import { ema, rollingVolatility, rsi, sma, vwap } from '~/utils/indicators'

const CAPACITY = 300
const INTERVAL_MS = 120

export default Vue.extend({
  name: 'IndexPage',
  data() {
    const instrument: Instrument = {
      symbol: 'BTC-PERP',
      tickSize: 0.5,
      lotSize: 1,
      pricePrecision: 2,
    }
    return {
      instrument,
      ticks: [] as Tick[],
      lastTick: null as Tick | null,
      sessionOpen: 0,
      streaming: false,
      seq: 0,
      buffer: new RingBuffer<Tick>(CAPACITY),
      feed: new MarketFeed(
        {
          symbol: instrument.symbol,
          startPrice: 64000,
          volatility: 0.0006,
          drift: 0.00001,
          spreadBps: 4,
        },
        20260526
      ),
    }
  },
  computed: {
    prices(): number[] {
      return this.ticks.map((t) => t.last)
    },
    volumes(): number[] {
      return this.ticks.map((t) => t.volume)
    },
    last(): number {
      return this.lastTick ? this.lastTick.last : 0
    },
    bid(): number {
      return this.lastTick ? this.lastTick.bid : 0
    },
    ask(): number {
      return this.lastTick ? this.lastTick.ask : 0
    },
    mid(): number {
      return this.bid > 0 && this.ask > 0 ? (this.bid + this.ask) / 2 : 0
    },
    spread(): number | null {
      return this.lastTick ? this.lastTick.ask - this.lastTick.bid : null
    },
    changePct(): number {
      if (this.sessionOpen <= 0 || this.last <= 0) return 0
      return ((this.last - this.sessionOpen) / this.sessionOpen) * 100
    },
    changeTone(): string {
      if (this.changePct > 0) return 'is-up'
      if (this.changePct < 0) return 'is-down'
      return ''
    },
    tickRate(): number {
      return this.streaming ? Math.round(1000 / INTERVAL_MS) : 0
    },
    sma20(): number | null {
      return sma(this.prices, 20)
    },
    ema12(): number | null {
      return ema(this.prices, 12)
    },
    rsi14(): number | null {
      return rsi(this.prices, 14)
    },
    vwapValue(): number | null {
      return vwap(this.prices, this.volumes)
    },
    vol20(): number | null {
      return rollingVolatility(this.prices, 20)
    },
    limits(): RiskLimits {
      return this.$store.state.trading.limits
    },
    position(): number {
      return this.$store.getters['trading/position']
    },
    avgPrice(): number {
      return this.$store.getters['trading/avgPrice']
    },
    realizedPnl(): number {
      return this.$store.getters['trading/realizedPnl']
    },
    unrealizedPnl(): number {
      return this.$store.getters['trading/unrealizedPnl'](this.last)
    },
    rejections(): number {
      return this.$store.state.trading.rejections
    },
    blotter(): Execution[] {
      return this.$store.state.trading.blotter
    },
  },
  mounted() {
    this.startFeed()
  },
  beforeDestroy() {
    this.feed.stop()
  },
  methods: {
    startFeed() {
      this.streaming = true
      this.feed.start(INTERVAL_MS, (tick: Tick) => {
        this.buffer.push(tick)
        this.ticks = this.buffer.toArray()
        this.lastTick = tick
        if (this.sessionOpen === 0) this.sessionOpen = tick.last
      })
    },
    toggleFeed() {
      if (this.streaming) {
        this.feed.stop()
        this.streaming = false
      } else {
        this.startFeed()
      }
    },
    toggleKill() {
      this.$store.commit('trading/toggleKillSwitch')
    },
    onSubmit(order: OrderRequest) {
      const result = evaluateOrder(
        order,
        {
          mid: this.mid,
          currentPosition: this.position,
          instrument: this.instrument,
        },
        this.limits
      )
      if (!result.ok) {
        this.$store.commit('trading/recordRejection')
        return
      }
      const fillPrice =
        order.type === 'limit' && order.limitPrice != null
          ? order.limitPrice
          : order.side === 'buy'
          ? this.ask
          : this.bid
      this.seq += 1
      const exec: Execution = {
        id: `${Date.now()}-${this.seq}`,
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        price: fillPrice,
        notional: fillPrice * order.qty,
        ts: Date.now(),
        status: 'filled',
      }
      this.$store.commit('trading/recordFill', exec)
    },
  },
})
</script>

<style scoped>
.hub {
  min-height: 100vh;
  background: radial-gradient(
    1200px 600px at 70% -10%,
    #16243a 0%,
    #0a0f1a 55%
  );
  color: #e2e8f0;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 18px;
}
.hub__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 14px 20px;
  background: rgba(14, 23, 38, 0.7);
  border: 1px solid rgba(120, 140, 180, 0.14);
  border-radius: 14px;
}
.hub__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.hub__logo {
  font-size: 1.8rem;
  color: #60a5fa;
}
.hub__brand h1 {
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
}
.hub__brand p {
  margin: 2px 0 0;
  font-size: 0.72rem;
  color: #64748b;
}
.hub__quote {
  display: flex;
  align-items: baseline;
  gap: 14px;
  font-family: 'Roboto Mono', monospace;
}
.hub__symbol {
  color: #94a3b8;
  font-weight: 600;
}
.hub__last {
  font-size: 1.5rem;
  font-weight: 700;
}
.hub__chg {
  font-size: 0.9rem;
}
.hub__status {
  display: flex;
  align-items: center;
  gap: 14px;
}
.hub__feed {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #0e1726;
  border: 1px solid rgba(120, 140, 180, 0.2);
  border-radius: 8px;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
}
.hub__feed-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #64748b;
}
.hub__feed-dot.live {
  background: #2dd4bf;
  box-shadow: 0 0 10px #2dd4bf;
  animation: pulse 1.4s infinite;
}
.hub__tps {
  font-size: 0.72rem;
  color: #64748b;
  font-family: 'Roboto Mono', monospace;
}
.hub__grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    'chart book'
    'chart ticket'
    'blotter risk';
  gap: 16px;
  margin-top: 16px;
}
.panel {
  background: rgba(14, 23, 38, 0.7);
  border: 1px solid rgba(120, 140, 180, 0.14);
  border-radius: 14px;
  padding: 16px;
}
.panel--chart {
  grid-area: chart;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.panel--book {
  grid-area: book;
}
.panel--ticket {
  grid-area: ticket;
}
.panel--risk {
  grid-area: risk;
}
.panel--blotter {
  grid-area: blotter;
}
.panel__title {
  margin: 0 0 14px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}
.is-up {
  color: #2dd4bf;
}
.is-down {
  color: #fb7185;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
@media (max-width: 900px) {
  .hub__grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'chart'
      'book'
      'ticket'
      'risk'
      'blotter';
  }
}
</style>
