// Persists cart / wishlist / delivery preference to localStorage and
// rehydrates the Vuex store on the client.
const KEY = 'capital-fresh-state'

export default ({ store }) => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || 'null')
    if (saved) store.commit('HYDRATE', saved)
  } catch (e) {
    // ignore corrupt storage
  }

  store.subscribe((_mutation, state) => {
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({
          cart: state.cart,
          wishlist: state.wishlist,
          deliveryFrequency: state.deliveryFrequency,
        })
      )
    } catch (e) {
      // storage may be unavailable (private mode) — fail silently
    }
  })
}
