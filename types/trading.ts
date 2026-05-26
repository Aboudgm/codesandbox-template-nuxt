// Domain model for the High-Frequency Algo Trading Hub.
// Every boundary in the system is typed against these structures.

export type Side = 'buy' | 'sell'
export type OrderType = 'market' | 'limit'
export type TimeInForce = 'IOC' | 'FOK' | 'GTC'
export type OrderStatus = 'filled' | 'rejected'

export interface Instrument {
  symbol: string
  /** Minimum price increment the venue accepts. */
  tickSize: number
  /** Minimum quantity increment the venue accepts. */
  lotSize: number
  pricePrecision: number
}

export interface Tick {
  symbol: string
  bid: number
  ask: number
  last: number
  volume: number
  ts: number
}

export interface OrderRequest {
  symbol: string
  side: Side
  type: OrderType
  qty: number
  limitPrice: number | null
  tif: TimeInForce
}

export interface RiskLimits {
  /** Largest single-order quantity (fat-finger guard). */
  maxOrderQty: number
  /** Largest notional value of a single order. */
  maxNotional: number
  /** Absolute net position ceiling. */
  maxPosition: number
  /** Allowed deviation of order price from mid, in basis points. */
  priceCollarBps: number
  /** Global halt — rejects every order while engaged. */
  killSwitch: boolean
}

export type RiskCode =
  | 'KILL_SWITCH_ENGAGED'
  | 'MISSING_LIMIT_PRICE'
  | 'QTY_EXCEEDS_MAX'
  | 'NOTIONAL_EXCEEDS_MAX'
  | 'POSITION_LIMIT_BREACH'
  | 'PRICE_COLLAR_BREACH'
  | 'INVALID_TICK_SIZE'
  | 'INVALID_LOT_SIZE'

export interface RiskViolation {
  code: RiskCode
  message: string
}

export interface RiskCheckResult {
  ok: boolean
  violations: RiskViolation[]
  estimatedNotional: number
  projectedPosition: number
}

export interface Execution {
  id: string
  symbol: string
  side: Side
  qty: number
  price: number
  notional: number
  ts: number
  status: OrderStatus
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult<T> {
  valid: boolean
  errors: ValidationError[]
  value: T | null
}
