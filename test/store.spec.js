import {
  state,
  getters,
  mutations,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
} from '@/store/index'
import { products } from '@/data/products'

const apple = products.find((p) => p.slug === 'pink-lady-apples')

describe('cart store', () => {
  let s
  beforeEach(() => {
    s = state()
  })

  test('ADD_TO_CART adds and stacks quantities', () => {
    mutations.ADD_TO_CART(s, { id: apple.id, qty: 2 })
    mutations.ADD_TO_CART(s, { id: apple.id, qty: 3 })
    expect(s.cart).toHaveLength(1)
    expect(getters.cartCount(s)).toBe(5)
  })

  test('SET_QTY to zero removes the line', () => {
    mutations.ADD_TO_CART(s, { id: apple.id, qty: 1 })
    mutations.SET_QTY(s, { id: apple.id, qty: 0 })
    expect(s.cart).toHaveLength(0)
  })

  test('subtotal and line totals compute from product price', () => {
    mutations.ADD_TO_CART(s, { id: apple.id, qty: 2 })
    const lines = getters.cartLines(s)
    expect(lines[0].lineTotal).toBeCloseTo(apple.price * 2, 2)
    expect(getters.subtotal(s, { cartLines: lines })).toBeCloseTo(
      apple.price * 2,
      2
    )
  })

  test('delivery is free above the threshold', () => {
    const big = { subtotal: FREE_DELIVERY_THRESHOLD + 10, cartLines: [{}] }
    expect(getters.deliveryFee(s, big)).toBe(0)
    const small = { subtotal: 10, cartLines: [{}] }
    expect(getters.deliveryFee(s, small)).toBe(DELIVERY_FEE)
  })

  test('subscription discount only applies to recurring orders', () => {
    s.deliveryFrequency = 'one-off'
    expect(getters.subscriptionDiscount(s, { subtotal: 100 })).toBe(0)
    s.deliveryFrequency = 'weekly'
    expect(getters.subscriptionDiscount(s, { subtotal: 100 })).toBe(10)
  })

  test('TOGGLE_WISHLIST adds then removes', () => {
    mutations.TOGGLE_WISHLIST(s, apple.id)
    expect(getters.isInWishlist(s)(apple.id)).toBe(true)
    mutations.TOGGLE_WISHLIST(s, apple.id)
    expect(getters.isInWishlist(s)(apple.id)).toBe(false)
  })
})
