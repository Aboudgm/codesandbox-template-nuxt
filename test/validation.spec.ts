import { validateOrderRequest } from '~/utils/validation'

describe('validateOrderRequest', () => {
  test('accepts a well-formed market order', () => {
    const result = validateOrderRequest({
      symbol: 'BTC-PERP',
      side: 'buy',
      type: 'market',
      qty: 10,
      tif: 'IOC',
    })
    expect(result.valid).toBe(true)
    expect(result.value).toEqual({
      symbol: 'BTC-PERP',
      side: 'buy',
      type: 'market',
      qty: 10,
      limitPrice: null,
      tif: 'IOC',
    })
  })

  test('requires a positive limit price for limit orders', () => {
    const result = validateOrderRequest({
      symbol: 'BTC-PERP',
      side: 'sell',
      type: 'limit',
      qty: 5,
      limitPrice: 0,
      tif: 'GTC',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.map((e) => e.field)).toContain('limitPrice')
  })

  test('rejects non-object input without throwing', () => {
    const result = validateOrderRequest(null)
    expect(result.valid).toBe(false)
    expect(result.value).toBeNull()
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('collects every problem at once', () => {
    const result = validateOrderRequest({
      symbol: '',
      side: 'hold',
      type: 'iceberg',
      qty: -4,
      tif: 'XXX',
    })
    const fields = result.errors.map((e) => e.field)
    expect(fields).toEqual(
      expect.arrayContaining(['symbol', 'side', 'type', 'qty', 'tif'])
    )
  })

  test('coerces numeric strings for qty', () => {
    const result = validateOrderRequest({
      symbol: 'ETH-PERP',
      side: 'buy',
      type: 'market',
      qty: '25',
      tif: 'FOK',
    })
    expect(result.valid).toBe(true)
    expect(result.value?.qty).toBe(25)
  })
})
