import {
  Instrument,
  OrderRequest,
  RiskCheckResult,
  RiskLimits,
  RiskViolation,
} from '~/types/trading'

export interface RiskContext {
  /** Current mid price used as the collar reference. */
  mid: number
  /** Signed net position before this order (positive = long). */
  currentPosition: number
  instrument: Instrument
}

// Floating-point-safe "is `value` a whole multiple of `step`" check.
function isMultipleOf(value: number, step: number): boolean {
  if (step <= 0) return true
  const ratio = value / step
  return Math.abs(ratio - Math.round(ratio)) < 1e-6
}

/**
 * Pre-trade risk gate. Evaluates every limit independently and returns the full
 * set of violations so the desk sees all problems at once rather than one at a
 * time. An order is accepted only when `violations` is empty.
 */
export function evaluateOrder(
  order: OrderRequest,
  ctx: RiskContext,
  limits: RiskLimits
): RiskCheckResult {
  const violations: RiskViolation[] = []

  const refPrice =
    order.type === 'limit' && order.limitPrice != null
      ? order.limitPrice
      : ctx.mid
  const estimatedNotional = refPrice * order.qty
  const signedQty = order.side === 'buy' ? order.qty : -order.qty
  const projectedPosition = ctx.currentPosition + signedQty

  if (limits.killSwitch) {
    violations.push({
      code: 'KILL_SWITCH_ENGAGED',
      message: 'Trading is halted: kill switch engaged.',
    })
  }

  if (order.type === 'limit' && order.limitPrice == null) {
    violations.push({
      code: 'MISSING_LIMIT_PRICE',
      message: 'Limit orders require a limit price.',
    })
  }

  if (order.qty > limits.maxOrderQty) {
    violations.push({
      code: 'QTY_EXCEEDS_MAX',
      message: `Quantity ${order.qty} exceeds max order size ${limits.maxOrderQty}.`,
    })
  }

  if (!isMultipleOf(order.qty, ctx.instrument.lotSize)) {
    violations.push({
      code: 'INVALID_LOT_SIZE',
      message: `Quantity must be a multiple of lot size ${ctx.instrument.lotSize}.`,
    })
  }

  if (
    order.type === 'limit' &&
    order.limitPrice != null &&
    !isMultipleOf(order.limitPrice, ctx.instrument.tickSize)
  ) {
    violations.push({
      code: 'INVALID_TICK_SIZE',
      message: `Limit price must be a multiple of tick size ${ctx.instrument.tickSize}.`,
    })
  }

  if (estimatedNotional > limits.maxNotional) {
    violations.push({
      code: 'NOTIONAL_EXCEEDS_MAX',
      message: `Notional ${estimatedNotional.toFixed(2)} exceeds max ${
        limits.maxNotional
      }.`,
    })
  }

  if (Math.abs(projectedPosition) > limits.maxPosition) {
    violations.push({
      code: 'POSITION_LIMIT_BREACH',
      message: `Projected position ${projectedPosition} breaches limit ${limits.maxPosition}.`,
    })
  }

  if (ctx.mid > 0) {
    const deviationBps = (Math.abs(refPrice - ctx.mid) / ctx.mid) * 1e4
    if (deviationBps > limits.priceCollarBps) {
      violations.push({
        code: 'PRICE_COLLAR_BREACH',
        message: `Price is ${deviationBps.toFixed(
          1
        )}bps from mid, beyond collar ${limits.priceCollarBps}bps.`,
      })
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    estimatedNotional,
    projectedPosition,
  }
}
