<template>
  <div>
    <transition name="fade">
      <div v-if="open" class="cd-overlay" @click="close"></div>
    </transition>
    <aside
      class="cd"
      :class="{ 'cd--open': open }"
      aria-label="Shopping basket"
    >
      <header class="cd__head">
        <h3>
          <i class="fa-solid fa-basket-shopping"></i> Your Basket
          <span class="cd__count">{{ cartCount }}</span>
        </h3>
        <button class="cd__close" aria-label="Close basket" @click="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <div v-if="cartLines.length" class="cd__body">
        <div class="cd__deliver">
          <FreeDeliveryBar />
        </div>

        <ul class="cd__list">
          <li v-for="line in cartLines" :key="line.id" class="cd-item">
            <NuxtLink
              :to="`/products/${line.product.slug}`"
              class="cd-item__media"
              :style="{ background: gradientFor(line.product) }"
              @click.native="close"
            >
              {{ line.product.emoji }}
            </NuxtLink>
            <div class="cd-item__info">
              <p class="cd-item__name">{{ line.product.name }}</p>
              <p class="cd-item__unit">
                ${{ line.price.toFixed(2) }} · {{ line.product.unit }}
              </p>
              <div class="cd-item__row">
                <QtyStepper
                  small
                  :value="line.qty"
                  @change="(q) => setQty(line.id, q)"
                />
                <button class="cd-item__rm" @click="remove(line.id)">
                  Remove
                </button>
              </div>
            </div>
            <span class="cd-item__total">${{ line.lineTotal.toFixed(2) }}</span>
          </li>
        </ul>
      </div>

      <div v-else class="cd__empty">
        <span class="cd__empty-emoji">🧺</span>
        <p>Your basket is empty</p>
        <span class="muted">Add some fresh goodness to get started.</span>
        <NuxtLink to="/shop" class="btn" @click.native="close"
          >Start shopping</NuxtLink
        >
      </div>

      <footer v-if="cartLines.length" class="cd__foot">
        <div class="cd__totals">
          <div class="cd__row">
            <span>Subtotal</span><span>${{ subtotal.toFixed(2) }}</span>
          </div>
          <div v-if="subscriptionDiscount > 0" class="cd__row cd__row--save">
            <span>Subscription saving</span
            ><span>−${{ subscriptionDiscount.toFixed(2) }}</span>
          </div>
          <div class="cd__row">
            <span>Delivery</span>
            <span>{{
              deliveryFee === 0 ? 'FREE' : '$' + deliveryFee.toFixed(2)
            }}</span>
          </div>
          <div class="cd__row cd__row--total">
            <span>Total</span><span>${{ total.toFixed(2) }}</span>
          </div>
        </div>
        <NuxtLink to="/checkout" class="btn btn--block" @click.native="close"
          >Checkout <i class="fa-solid fa-arrow-right"></i
        ></NuxtLink>
        <NuxtLink to="/cart" class="cd__viewcart" @click.native="close"
          >View full basket</NuxtLink
        >
      </footer>
    </aside>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { categories } from '~/data/products'

export default {
  name: 'CartDrawer',
  computed: {
    ...mapGetters([
      'cartLines',
      'cartCount',
      'subtotal',
      'deliveryFee',
      'subscriptionDiscount',
      'total',
    ]),
    open() {
      return this.$store.state.ui.cartOpen
    },
  },
  watch: {
    open(val) {
      if (process.client) {
        document.body.style.overflow = val ? 'hidden' : ''
      }
    },
    $route() {
      this.close()
    },
  },
  methods: {
    close() {
      this.$store.commit('SET_CART_OPEN', false)
    },
    setQty(id, qty) {
      this.$store.commit('SET_QTY', { id, qty })
    },
    remove(id) {
      this.$store.commit('REMOVE_FROM_CART', id)
    },
    gradientFor(product) {
      const cat = categories.find((c) => c.slug === product.category)
      return product.gradient || (cat && cat.gradient) || 'var(--green-100)'
    },
  },
}
</script>

<style scoped>
.cd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 58, 36, 0.42);
  z-index: 1100;
}
.cd {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  background: var(--cream);
  z-index: 1110;
  transform: translateX(100%);
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}
.cd--open {
  transform: translateX(0);
}
.cd__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}
.cd__head h3 {
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 9px;
}
.cd__head i {
  color: var(--green-600);
}
.cd__count {
  background: var(--green-100);
  color: var(--green-700);
  font-family: var(--font-body);
  font-size: 0.8rem;
  padding: 1px 9px;
  border-radius: 999px;
}
.cd__close {
  border: 0;
  background: transparent;
  font-size: 1.3rem;
  color: var(--muted);
}
.cd__close:hover {
  color: var(--ink);
}
.cd__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.cd__deliver {
  margin-bottom: 16px;
}
.cd__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cd-item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 12px;
  align-items: start;
}
.cd-item__media {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 1.8rem;
}
.cd-item__name {
  margin: 0;
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1.2;
}
.cd-item__unit {
  margin: 2px 0 8px;
  font-size: 0.78rem;
  color: var(--muted);
}
.cd-item__row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cd-item__rm {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  text-decoration: underline;
  padding: 0;
}
.cd-item__rm:hover {
  color: var(--danger);
}
.cd-item__total {
  font-weight: 700;
  color: var(--green-700);
  font-size: 0.95rem;
}
.cd__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 30px;
}
.cd__empty-emoji {
  font-size: 3.4rem;
}
.cd__empty p {
  font-weight: 600;
  font-size: 1.1rem;
  margin: 4px 0 0;
}
.cd__empty .btn {
  margin-top: 12px;
}
.cd__foot {
  border-top: 1px solid var(--line);
  background: #fff;
  padding: 16px 20px 20px;
}
.cd__totals {
  margin-bottom: 14px;
}
.cd__row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  padding: 3px 0;
  color: var(--muted);
}
.cd__row--save {
  color: var(--green-600);
  font-weight: 600;
}
.cd__row--total {
  color: var(--ink);
  font-weight: 700;
  font-size: 1.15rem;
  border-top: 1px dashed var(--line);
  margin-top: 6px;
  padding-top: 10px;
}
.cd__viewcart {
  display: block;
  text-align: center;
  margin-top: 12px;
  font-size: 0.88rem;
  color: var(--green-700);
  text-decoration: underline;
}
</style>
