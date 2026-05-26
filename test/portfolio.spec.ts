import { applyFill, flatPortfolio } from '~/utils/portfolio'

describe('applyFill', () => {
  test('opens a long position at the fill price', () => {
    const s = applyFill(flatPortfolio(), { side: 'buy', qty: 10, price: 100 })
    expect(s).toEqual({ position: 10, avgPrice: 100, realizedPnl: 0 })
  })

  test('blends the average price when adding to a position', () => {
    let s = applyFill(flatPortfolio(), { side: 'buy', qty: 10, price: 100 })
    s = applyFill(s, { side: 'buy', qty: 10, price: 120 })
    expect(s.position).toBe(20)
    expect(s.avgPrice).toBe(110)
    expect(s.realizedPnl).toBe(0)
  })

  test('realizes profit when reducing a long', () => {
    let s = applyFill(flatPortfolio(), { side: 'buy', qty: 10, price: 100 })
    s = applyFill(s, { side: 'sell', qty: 4, price: 130 })
    expect(s.position).toBe(6)
    expect(s.avgPrice).toBe(100)
    expect(s.realizedPnl).toBe((130 - 100) * 4)
  })

  test('flattens to zero and keeps realized P&L', () => {
    let s = applyFill(flatPortfolio(), { side: 'buy', qty: 10, price: 100 })
    s = applyFill(s, { side: 'sell', qty: 10, price: 90 })
    expect(s.position).toBe(0)
    expect(s.avgPrice).toBe(0)
    expect(s.realizedPnl).toBe((90 - 100) * 10)
  })

  test('flips through zero, opening the remainder at the new price', () => {
    let s = applyFill(flatPortfolio(), { side: 'buy', qty: 10, price: 100 })
    s = applyFill(s, { side: 'sell', qty: 15, price: 110 })
    expect(s.position).toBe(-5)
    expect(s.avgPrice).toBe(110)
    expect(s.realizedPnl).toBe((110 - 100) * 10)
  })

  test('does not mutate the input state', () => {
    const start = flatPortfolio()
    applyFill(start, { side: 'buy', qty: 5, price: 50 })
    expect(start).toEqual({ position: 0, avgPrice: 0, realizedPnl: 0 })
  })
})
