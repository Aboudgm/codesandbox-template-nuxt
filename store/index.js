import { products, effectivePrice } from '~/data/products'

export const FREE_DELIVERY_THRESHOLD = 50
export const DELIVERY_FEE = 6.9

const findProduct = (id) => products.find((p) => p.id === id)

export const state = () => ({
  // cart entries: { id, qty }
  cart: [],
  wishlist: [],
  deliveryFrequency: 'one-off', // one-off | weekly | fortnightly
  ui: {
    cartOpen: false,
    mobileNavOpen: false,
  },
  toasts: [],
  _toastSeq: 0,
})

export const getters = {
  cartLines(state) {
    return state.cart
      .map((entry) => {
        const product = findProduct(entry.id)
        if (!product) return null
        const price = effectivePrice(product)
        return {
          ...entry,
          product,
          price,
          lineTotal: +(price * entry.qty).toFixed(2),
        }
      })
      .filter(Boolean)
  },
  cartCount(state) {
    return state.cart.reduce((sum, e) => sum + e.qty, 0)
  },
  subtotal(_state, getters) {
    return +getters.cartLines
      .reduce((sum, l) => sum + l.lineTotal, 0)
      .toFixed(2)
  },
  deliveryFee(_state, getters) {
    if (getters.cartLines.length === 0) return 0
    return getters.subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  },
  subscriptionDiscount(state, getters) {
    // Reward recurring deliveries with a standing discount.
    const rate = state.deliveryFrequency === 'one-off' ? 0 : 0.1
    return +(getters.subtotal * rate).toFixed(2)
  },
  total(_state, getters) {
    return +(
      getters.subtotal +
      getters.deliveryFee -
      getters.subscriptionDiscount
    ).toFixed(2)
  },
  amountToFreeDelivery(_state, getters) {
    return Math.max(0, +(FREE_DELIVERY_THRESHOLD - getters.subtotal).toFixed(2))
  },
  isInWishlist: (state) => (id) => state.wishlist.includes(id),
  qtyInCart: (state) => (id) => {
    const entry = state.cart.find((e) => e.id === id)
    return entry ? entry.qty : 0
  },
}

export const mutations = {
  HYDRATE(state, saved) {
    if (!saved) return
    if (Array.isArray(saved.cart)) state.cart = saved.cart
    if (Array.isArray(saved.wishlist)) state.wishlist = saved.wishlist
    if (saved.deliveryFrequency)
      state.deliveryFrequency = saved.deliveryFrequency
  },
  ADD_TO_CART(state, { id, qty = 1 }) {
    const entry = state.cart.find((e) => e.id === id)
    if (entry) {
      entry.qty += qty
    } else {
      state.cart.push({ id, qty })
    }
  },
  SET_QTY(state, { id, qty }) {
    const entry = state.cart.find((e) => e.id === id)
    if (!entry) return
    if (qty <= 0) {
      state.cart = state.cart.filter((e) => e.id !== id)
    } else {
      entry.qty = qty
    }
  },
  REMOVE_FROM_CART(state, id) {
    state.cart = state.cart.filter((e) => e.id !== id)
  },
  CLEAR_CART(state) {
    state.cart = []
  },
  TOGGLE_WISHLIST(state, id) {
    if (state.wishlist.includes(id)) {
      state.wishlist = state.wishlist.filter((x) => x !== id)
    } else {
      state.wishlist.push(id)
    }
  },
  SET_DELIVERY_FREQUENCY(state, value) {
    state.deliveryFrequency = value
  },
  SET_CART_OPEN(state, open) {
    state.ui.cartOpen = open
  },
  SET_MOBILE_NAV(state, open) {
    state.ui.mobileNavOpen = open
  },
  PUSH_TOAST(state, toast) {
    state._toastSeq += 1
    state.toasts.push({ id: state._toastSeq, ...toast })
  },
  DISMISS_TOAST(state, id) {
    state.toasts = state.toasts.filter((t) => t.id !== id)
  },
}

export const actions = {
  addToCart({ commit }, { id, qty = 1, openCart = false }) {
    const product = findProduct(id)
    commit('ADD_TO_CART', { id, qty })
    if (product) {
      commit('PUSH_TOAST', {
        type: 'success',
        message: `${product.emoji} ${product.name} added to your basket`,
      })
    }
    if (openCart) commit('SET_CART_OPEN', true)
  },
  toggleWishlist({ commit, state }, id) {
    const product = findProduct(id)
    const wasIn = state.wishlist.includes(id)
    commit('TOGGLE_WISHLIST', id)
    if (product) {
      commit('PUSH_TOAST', {
        type: wasIn ? 'info' : 'success',
        message: wasIn
          ? `Removed ${product.name} from favourites`
          : `❤️ Saved ${product.name} to favourites`,
      })
    }
  },
  notify({ commit }, payload) {
    commit('PUSH_TOAST', payload)
  },
}
