import { Tick } from '~/types/trading'

// Deterministic, seedable PRNG so the feed can be reproduced in tests.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface FeedParams {
  symbol: string
  startPrice: number
  /** Per-tick log-return standard deviation. */
  volatility: number
  /** Per-tick log-return drift. */
  drift: number
  /** Bid/ask spread expressed in basis points of mid. */
  spreadBps: number
}

function round(value: number, dp = 2): number {
  const f = 10 ** dp
  return Math.round(value * f) / f
}

// Box–Muller transform into a standard normal sample.
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-9)
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/** Pure geometric-Brownian-motion step — given the previous tick, produce the next. */
export function nextTick(
  prev: Tick,
  params: FeedParams,
  rand: () => number,
  now: number = Date.now()
): Tick {
  const ret = params.drift + params.volatility * gaussian(rand)
  const mid = Math.max(0.01, prev.last * Math.exp(ret))
  const half = (mid * params.spreadBps) / 1e4 / 2
  return {
    symbol: params.symbol,
    bid: round(mid - half),
    ask: round(mid + half),
    last: round(mid),
    volume: Math.round(1 + rand() * 50),
    ts: now,
  }
}

/**
 * Wraps `nextTick` in a timer that streams ticks to a subscriber — stands in
 * for the Protobuf-over-WebSocket ingress described in the system topology.
 */
export class MarketFeed {
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly rand: () => number
  private last: Tick

  constructor(private readonly params: FeedParams, seed: number = Date.now()) {
    this.rand = mulberry32(seed)
    const half = (params.startPrice * params.spreadBps) / 1e4 / 2
    this.last = {
      symbol: params.symbol,
      bid: round(params.startPrice - half),
      ask: round(params.startPrice + half),
      last: round(params.startPrice),
      volume: 0,
      ts: Date.now(),
    }
  }

  get lastTick(): Tick {
    return this.last
  }

  start(intervalMs: number, onTick: (tick: Tick) => void): void {
    this.stop()
    this.timer = setInterval(() => {
      this.last = nextTick(this.last, this.params, this.rand)
      onTick(this.last)
    }, intervalMs)
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
