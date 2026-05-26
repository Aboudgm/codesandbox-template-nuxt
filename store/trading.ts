import { Execution, RiskLimits } from '~/types/trading'
import { applyFill, flatPortfolio, PortfolioState } from '~/utils/portfolio'

export interface TradingState {
  limits: RiskLimits
  portfolio: PortfolioState
  blotter: Execution[]
  rejections: number
}

const BLOTTER_MAX = 200

export const state = (): TradingState => ({
  limits: {
    maxOrderQty: 1000,
    maxNotional: 5_000_000,
    maxPosition: 5000,
    priceCollarBps: 50,
    killSwitch: false,
  },
  portfolio: flatPortfolio(),
  blotter: [],
  rejections: 0,
})

export const getters = {
  position: (s: TradingState): number => s.portfolio.position,
  avgPrice: (s: TradingState): number => s.portfolio.avgPrice,
  realizedPnl: (s: TradingState): number => s.portfolio.realizedPnl,
  unrealizedPnl:
    (s: TradingState) =>
    (mark: number): number =>
      s.portfolio.position * (mark - s.portfolio.avgPrice),
}

export const mutations = {
  recordFill(s: TradingState, exec: Execution): void {
    s.portfolio = applyFill(s.portfolio, exec)
    s.blotter.unshift(exec)
    if (s.blotter.length > BLOTTER_MAX) s.blotter.pop()
  },
  recordRejection(s: TradingState): void {
    s.rejections += 1
  },
  setLimits(s: TradingState, limits: Partial<RiskLimits>): void {
    s.limits = { ...s.limits, ...limits }
  },
  toggleKillSwitch(s: TradingState): void {
    s.limits = { ...s.limits, killSwitch: !s.limits.killSwitch }
  },
  reset(s: TradingState): void {
    s.portfolio = flatPortfolio()
    s.blotter = []
    s.rejections = 0
  },
}
