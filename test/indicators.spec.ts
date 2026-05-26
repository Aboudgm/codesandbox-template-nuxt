import { ema, rollingVolatility, rsi, sma, vwap } from '~/utils/indicators'

describe('sma', () => {
  test('returns null with insufficient data', () => {
    expect(sma([1, 2], 3)).toBeNull()
    expect(sma([1, 2, 3], 0)).toBeNull()
  })

  test('averages the trailing window', () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3)
    expect(sma([2, 4, 6, 8], 2)).toBe(7)
  })
})

describe('ema', () => {
  test('returns null with insufficient data', () => {
    expect(ema([1, 2], 5)).toBeNull()
  })

  test('equals the value for a flat series', () => {
    expect(ema([5, 5, 5, 5, 5], 3)).toBeCloseTo(5, 6)
  })

  test('reacts to a recent jump faster than sma', () => {
    const series = [10, 10, 10, 10, 20]
    const emaVal = ema(series, 4) as number
    const smaVal = sma(series, 4) as number
    expect(emaVal).toBeGreaterThan(smaVal)
  })
})

describe('rsi', () => {
  test('returns null with insufficient data', () => {
    expect(rsi([1, 2, 3], 14)).toBeNull()
  })

  test('is 100 for a monotonically rising series', () => {
    const rising = Array.from({ length: 20 }, (_, i) => i + 1)
    expect(rsi(rising, 14)).toBe(100)
  })

  test('stays within 0..100', () => {
    const series = [
      44, 44.3, 44.1, 43.6, 44.3, 44.8, 45.1, 45.4, 45.1, 45.7, 46.0, 45.8,
      46.0, 46.4, 46.2, 45.6,
    ]
    const value = rsi(series, 14) as number
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(100)
  })
})

describe('vwap', () => {
  test('returns null on length mismatch or empty input', () => {
    expect(vwap([], [])).toBeNull()
    expect(vwap([1, 2], [1])).toBeNull()
  })

  test('weights price by volume', () => {
    expect(vwap([10, 20], [1, 3])).toBe((10 * 1 + 20 * 3) / 4)
  })

  test('returns null when total volume is zero', () => {
    expect(vwap([10, 20], [0, 0])).toBeNull()
  })
})

describe('rollingVolatility', () => {
  test('returns null with insufficient data', () => {
    expect(rollingVolatility([1], 2)).toBeNull()
  })

  test('is zero for a constant series', () => {
    expect(rollingVolatility([7, 7, 7, 7], 4)).toBe(0)
  })

  test('matches the sample standard deviation', () => {
    expect(rollingVolatility([2, 4, 6], 3)).toBeCloseTo(2, 6)
  })
})
