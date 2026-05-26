import { evaluateOrder, RiskContext } from '~/utils/risk'
import { Instrument, OrderRequest, RiskLimits } from '~/types/trading'

const instrument: Instrument = {
  symbol: 'BTC-PERP',
  tickSize: 0.5,
  lotSize: 1,
  pricePrecision: 2,
}

const limits: RiskLimits = {
  maxOrderQty: 1000,
  maxNotional: 5_000_000,
  maxPosition: 5000,
  priceCollarBps: 50,
  killSwitch: false,
}

const ctx: RiskContext = {
  mid: 64000,
  currentPosition: 0,
  instrument,
}

const baseOrder: OrderRequest = {
  symbol: 'BTC-PERP',
  side: 'buy',
  type: 'market',
  qty: 10,
  limitPrice: null,
  tif: 'IOC',
}

function codes(order: OrderRequest, c = ctx, l = limits): string[] {
  return evaluateOrder(order, c, l).violations.map((v) => v.code)
}

describe('evaluateOrder', () => {
  test('accepts a compliant market order', () => {
    const result = evaluateOrder(baseOrder, ctx, limits)
    expect(result.ok).toBe(true)
    expect(result.violations).toHaveLength(0)
    expect(result.estimatedNotional).toBe(64000 * 10)
    expect(result.projectedPosition).toBe(10)
  })

  test('blocks every order when the kill switch is engaged', () => {
    expect(codes(baseOrder, ctx, { ...limits, killSwitch: true })).toContain(
      'KILL_SWITCH_ENGAGED'
    )
  })

  test('flags fat-finger quantity', () => {
    expect(codes({ ...baseOrder, qty: 2000 })).toContain('QTY_EXCEEDS_MAX')
  })

  test('flags excessive notional', () => {
    expect(codes({ ...baseOrder, qty: 100 })).toContain('NOTIONAL_EXCEEDS_MAX')
  })

  test('flags projected position breach', () => {
    expect(
      codes({ ...baseOrder, qty: 600 }, { ...ctx, currentPosition: 4800 })
    ).toContain('POSITION_LIMIT_BREACH')
  })

  test('requires a limit price on limit orders', () => {
    expect(codes({ ...baseOrder, type: 'limit', limitPrice: null })).toContain(
      'MISSING_LIMIT_PRICE'
    )
  })

  test('flags price outside the collar', () => {
    expect(codes({ ...baseOrder, type: 'limit', limitPrice: 70000 })).toContain(
      'PRICE_COLLAR_BREACH'
    )
  })

  test('flags tick-size and lot-size violations', () => {
    const result = codes({
      ...baseOrder,
      type: 'limit',
      qty: 1.5,
      limitPrice: 64000.3,
    })
    expect(result).toContain('INVALID_TICK_SIZE')
    expect(result).toContain('INVALID_LOT_SIZE')
  })

  test('reports a sell as a negative projected position', () => {
    const result = evaluateOrder(
      { ...baseOrder, side: 'sell', qty: 50 },
      ctx,
      limits
    )
    expect(result.projectedPosition).toBe(-50)
  })
})
