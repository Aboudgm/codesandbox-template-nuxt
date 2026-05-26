import { Side } from '~/types/trading'

export interface PortfolioState {
  /** Signed net position (positive = long). */
  position: number
  /** Average entry price of the open position; 0 when flat. */
  avgPrice: number
  /** Cumulative realized profit and loss. */
  realizedPnl: number
}

export const flatPortfolio = (): PortfolioState => ({
  position: 0,
  avgPrice: 0,
  realizedPnl: 0,
})

const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0)

/**
 * Average-cost position accounting. Increasing the position blends the entry
 * price; reducing or flipping it realizes P&L on the closed quantity. Returns a
 * new state object — never mutates the input.
 */
export function applyFill(
  state: PortfolioState,
  fill: { side: Side; qty: number; price: number }
): PortfolioState {
  const signedQty = fill.side === 'buy' ? fill.qty : -fill.qty
  const { position, avgPrice, realizedPnl } = state

  // Opening from flat or adding in the same direction: blend the average.
  if (position === 0 || sign(position) === sign(signedQty)) {
    const newPosition = position + signedQty
    const newAvg =
      (Math.abs(position) * avgPrice + Math.abs(signedQty) * fill.price) /
      Math.abs(newPosition)
    return { position: newPosition, avgPrice: newAvg, realizedPnl }
  }

  // Reducing or flipping: realize P&L on the quantity that closes.
  const closingQty = Math.min(Math.abs(signedQty), Math.abs(position))
  const pnlPerUnit = (fill.price - avgPrice) * sign(position)
  const newRealized = realizedPnl + pnlPerUnit * closingQty
  const newPosition = position + signedQty

  if (newPosition === 0) {
    return { position: 0, avgPrice: 0, realizedPnl: newRealized }
  }

  // Position flipped through zero — the remainder opens at the fill price.
  if (sign(newPosition) !== sign(position)) {
    return {
      position: newPosition,
      avgPrice: fill.price,
      realizedPnl: newRealized,
    }
  }

  // Partially reduced — average entry price is unchanged.
  return { position: newPosition, avgPrice, realizedPnl: newRealized }
}
