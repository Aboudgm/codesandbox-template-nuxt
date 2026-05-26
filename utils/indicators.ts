// Pure technical-indicator functions. Each returns `null` when there is
// insufficient data so callers can render placeholders without branching on
// magic numbers.

export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null
  let sum = 0
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i]
  }
  return sum / period
}

export function ema(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null
  const k = 2 / (period + 1)
  let acc = 0
  for (let i = 0; i < period; i++) acc += values[i]
  let prev = acc / period
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
  }
  return prev
}

export function rsi(values: number[], period = 14): number | null {
  if (period <= 0 || values.length <= period) return null
  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const delta = values[i] - values[i - 1]
    if (delta >= 0) gains += delta
    else losses -= delta
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1]
    const gain = delta > 0 ? delta : 0
    const loss = delta < 0 ? -delta : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function vwap(prices: number[], volumes: number[]): number | null {
  if (prices.length === 0 || prices.length !== volumes.length) return null
  let pv = 0
  let v = 0
  for (let i = 0; i < prices.length; i++) {
    pv += prices[i] * volumes[i]
    v += volumes[i]
  }
  return v === 0 ? null : pv / v
}

/** Sample standard deviation over the trailing `period` values. */
export function rollingVolatility(
  values: number[],
  period: number
): number | null {
  if (period < 2 || values.length < period) return null
  const slice = values.slice(values.length - period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance =
    slice.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (period - 1)
  return Math.sqrt(variance)
}
