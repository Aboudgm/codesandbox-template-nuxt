import { FeedParams, mulberry32, nextTick } from '~/utils/marketFeed'
import { Tick } from '~/types/trading'

const params: FeedParams = {
  symbol: 'BTC-PERP',
  startPrice: 100,
  volatility: 0.01,
  drift: 0,
  spreadBps: 10,
}

const seedTick = (): Tick => ({
  symbol: 'BTC-PERP',
  bid: 99.95,
  ask: 100.05,
  last: 100,
  volume: 0,
  ts: 0,
})

describe('mulberry32', () => {
  test('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  test('produces values in [0, 1)', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('nextTick', () => {
  test('keeps bid below ask around the mid', () => {
    const rand = mulberry32(1)
    const tick = nextTick(seedTick(), params, rand, 1000)
    expect(tick.bid).toBeLessThan(tick.ask)
    expect(tick.last).toBeGreaterThanOrEqual(tick.bid)
    expect(tick.last).toBeLessThanOrEqual(tick.ask)
    expect(tick.ts).toBe(1000)
    expect(tick.symbol).toBe('BTC-PERP')
  })

  test('is reproducible with the same seed', () => {
    const t1 = nextTick(seedTick(), params, mulberry32(99), 0)
    const t2 = nextTick(seedTick(), params, mulberry32(99), 0)
    expect(t1).toEqual(t2)
  })

  test('never produces a non-positive price', () => {
    const rand = mulberry32(123)
    let tick = seedTick()
    for (let i = 0; i < 200; i++) {
      tick = nextTick(tick, { ...params, volatility: 0.2 }, rand)
      expect(tick.last).toBeGreaterThan(0)
    }
  })
})
