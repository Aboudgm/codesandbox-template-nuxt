import {
  OrderRequest,
  OrderType,
  Side,
  TimeInForce,
  ValidationError,
  ValidationResult,
} from '~/types/trading'

// Native, dependency-free boundary validation. Mirrors what a Zod/Pydantic
// schema would enforce: shape, types, enums and ranges — returning every
// problem at once rather than throwing on the first.

const SIDES: readonly Side[] = ['buy', 'sell']
const TYPES: readonly OrderType[] = ['market', 'limit']
const TIFS: readonly TimeInForce[] = ['IOC', 'FOK', 'GTC']

export function validateOrderRequest(
  input: unknown
): ValidationResult<OrderRequest> {
  const errors: ValidationError[] = []
  const raw =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : {}

  const symbol = typeof raw.symbol === 'string' ? raw.symbol.trim() : ''
  if (!symbol) {
    errors.push({ field: 'symbol', message: 'symbol is required.' })
  }

  const side = raw.side as Side
  if (!SIDES.includes(side)) {
    errors.push({
      field: 'side',
      message: `side must be one of ${SIDES.join(', ')}.`,
    })
  }

  const type = raw.type as OrderType
  if (!TYPES.includes(type)) {
    errors.push({
      field: 'type',
      message: `type must be one of ${TYPES.join(', ')}.`,
    })
  }

  const tif = raw.tif as TimeInForce
  if (!TIFS.includes(tif)) {
    errors.push({
      field: 'tif',
      message: `tif must be one of ${TIFS.join(', ')}.`,
    })
  }

  const qty = Number(raw.qty)
  if (!Number.isFinite(qty) || qty <= 0) {
    errors.push({ field: 'qty', message: 'qty must be a positive number.' })
  }

  let limitPrice: number | null = null
  if (type === 'limit') {
    const lp = Number(raw.limitPrice)
    if (!Number.isFinite(lp) || lp <= 0) {
      errors.push({
        field: 'limitPrice',
        message: 'limit orders require a positive limitPrice.',
      })
    } else {
      limitPrice = lp
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null }
  }

  return {
    valid: true,
    errors: [],
    value: { symbol, side, type, qty, limitPrice, tif },
  }
}
