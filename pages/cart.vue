<template>
  <div class="container cartpage">
    <h1 class="cartpage__title">Your basket</h1>

    <div v-if="cartLines.length" class="cartpage__layout">
      <div class="cartpage__items">
        <FreeDeliveryBar class="cartpage__fdb" />

        <div v-for="line in cartLines" :key="line.id" class="ci">
          <NuxtLink
            :to="`/products/${line.product.slug}`"
            class="ci__media"
            :style="{ background: gradientFor(line.product) }"
            >{{ line.product.emoji }}</NuxtLink
          >
          <div class="ci__info">
            <NuxtLink :to="`/products/${line.product.slug}`" class="ci__name">{{
              line.product.name
            }}</NuxtLink>
            <p class="muted ci__unit">
              ${{ line.price.toFixed(2) }} · {{ line.product.unit }}
            </p>
            <button class="ci__rm" @click="remove(line.id)">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </div>
          <QtyStepper :value="line.qty" @change="(q) => setQty(line.id, q)" />
          <span class="ci__total">${{ line.lineTotal.toFixed(2) }}</span>
        </div>

        <div class="cartpage__actions">
          <NuxtLink to="/shop" class="btn btn--ghost"
            ><i class="fa-solid fa-arrow-left"></i> Continue shopping</NuxtLink
          >
          <button class="cartpage__clear" @click="clear">Clear basket</button>
        </div>
      </div>

      <aside class="summary card">
        <h3>Order summary</h3>

        <div class="summary__freq">
          <p class="summary__freqlabel">Delivery frequency</p>
          <div class="freq">
            <button
              v-for="opt in freqOptions"
              :key="opt.value"
              :class="{ 'is-active': deliveryFrequency === opt.value }"
              @click="setFreq(opt.value)"
            >
              {{ opt.label }}
              <small v-if="opt.value !== 'one-off'">−10%</small>
            </button>
          </div>
        </div>

        <div class="summary__rows">
          <div class="summary__row">
            <span>Subtotal</span><span>${{ subtotal.toFixed(2) }}</span>
          </div>
          <div
            v-if="subscriptionDiscount > 0"
            class="summary__row summary__row--save"
          >
            <span>Subscription saving</span
            ><span>−${{ subscriptionDiscount.toFixed(2) }}</span>
          </div>
          <div class="summary__row">
            <span>Delivery</span>
            <span>{{
              deliveryFee === 0 ? 'FREE' : '$' + deliveryFee.toFixed(2)
            }}</span>
          </div>
          <div class="summary__row summary__row--total">
            <span>Total</span><span>${{ total.toFixed(2) }}</span>
          </div>
        </div>

        <div class="promo-code">
          <input v-model="code" type="text" placeholder="Promo code" />
          <button class="btn btn--ghost btn--sm" @click="applyCode">
            Apply
          </button>
        </div>
        <p v-if="codeMsg" class="promo-code__msg">{{ codeMsg }}</p>

        <NuxtLink to="/checkout" class="btn btn--block"
          >Proceed to checkout <i class="fa-solid fa-arrow-right"></i
        ></NuxtLink>
        <p class="summary__secure">
          <i class="fa-solid fa-lock"></i> Secure checkout
        </p>
      </aside>
    </div>

    <div v-else class="cartpage__empty">
      <span>🧺</span>
      <h2>Your basket is empty</h2>
      <p class="muted">Looks like you haven't added anything fresh yet.</p>
      <NuxtLink to="/shop" class="btn">Browse the market</NuxtLink>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { categories } from '~/data/products'

export default {
  name: 'CartPage',
  data() {
    return {
      code: '',
      codeMsg: '',
      freqOptions: [
        { value: 'one-off', label: 'One-off' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'fortnightly', label: 'Fortnightly' },
      ],
    }
  },
  computed: {
    ...mapGetters([
      'cartLines',
      'subtotal',
      'deliveryFee',
      'subscriptionDiscount',
      'total',
    ]),
    deliveryFrequency() {
      return this.$store.state.deliveryFrequency
    },
  },
  methods: {
    setQty(id, qty) {
      this.$store.commit('SET_QTY', { id, qty })
    },
    remove(id) {
      this.$store.commit('REMOVE_FROM_CART', id)
    },
    clear() {
      this.$store.commit('CLEAR_CART')
    },
    setFreq(v) {
      this.$store.commit('SET_DELIVERY_FREQUENCY', v)
    },
    applyCode() {
      const valid = ['FRESH10', 'WELCOME']
      this.codeMsg = valid.includes(this.code.trim().toUpperCase())
        ? '✅ Code applied at checkout!'
        : '❌ That code isn’t valid.'
    },
    gradientFor(product) {
      const cat = categories.find((c) => c.slug === product.category)
      return product.gradient || (cat && cat.gradient) || 'var(--green-100)'
    },
  },
}
</script>

<style scoped>
.cartpage {
  padding: 36px 20px 70px;
}
.cartpage__title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin-bottom: 22px;
}
.cartpage__layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 28px;
  align-items: start;
}
.cartpage__fdb {
  margin-bottom: 18px;
}
.ci {
  display: grid;
  grid-template-columns: 84px 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.ci__media {
  width: 84px;
  height: 84px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 2.3rem;
}
.ci__name {
  font-weight: 600;
  font-size: 1.02rem;
}
.ci__name:hover {
  color: var(--green-600);
}
.ci__unit {
  margin: 3px 0 8px;
  font-size: 0.85rem;
}
.ci__rm {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.82rem;
  padding: 0;
}
.ci__rm:hover {
  color: var(--danger);
}
.ci__total {
  font-weight: 700;
  color: var(--green-700);
  min-width: 70px;
  text-align: right;
}
.cartpage__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  gap: 12px;
  flex-wrap: wrap;
}
.cartpage__clear {
  border: 0;
  background: transparent;
  color: var(--muted);
  text-decoration: underline;
}
.cartpage__clear:hover {
  color: var(--danger);
}

/* summary */
.summary {
  padding: 22px;
  position: sticky;
  top: calc(var(--header-h) + 24px);
}
.summary h3 {
  margin-bottom: 16px;
}
.summary__freqlabel {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
  margin: 0 0 8px;
}
.freq {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 18px;
}
.freq button {
  border: 1.5px solid var(--line);
  background: #fff;
  border-radius: var(--radius-sm);
  padding: 8px 4px;
  font-size: 0.82rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.freq button small {
  color: var(--green-600);
  font-size: 0.68rem;
}
.freq button.is-active {
  border-color: var(--green-600);
  background: var(--green-50);
}
.summary__rows {
  border-top: 1px solid var(--line);
  padding-top: 14px;
}
.summary__row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  color: var(--muted);
  font-size: 0.92rem;
}
.summary__row--save {
  color: var(--green-600);
  font-weight: 600;
}
.summary__row--total {
  color: var(--ink);
  font-weight: 700;
  font-size: 1.25rem;
  border-top: 1px dashed var(--line);
  margin-top: 8px;
  padding-top: 12px;
}
.promo-code {
  display: flex;
  gap: 8px;
  margin: 16px 0 4px;
}
.promo-code input {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 10px 16px;
  font-family: inherit;
  outline: 0;
}
.promo-code__msg {
  font-size: 0.82rem;
  margin: 2px 0 10px;
}
.summary .btn--block {
  margin-top: 14px;
}
.summary__secure {
  text-align: center;
  color: var(--muted);
  font-size: 0.82rem;
  margin: 12px 0 0;
}

.cartpage__empty {
  text-align: center;
  padding: 70px 20px;
}
.cartpage__empty span {
  font-size: 4rem;
}
.cartpage__empty h2 {
  margin: 12px 0 4px;
}
.cartpage__empty .btn {
  margin-top: 16px;
}

@media (max-width: 820px) {
  .cartpage__layout {
    grid-template-columns: 1fr;
  }
  .summary {
    position: relative;
    top: 0;
  }
  .ci {
    grid-template-columns: 64px 1fr auto;
    grid-template-areas:
      'media info info'
      'media qty total';
  }
  .ci__media {
    grid-area: media;
    width: 64px;
    height: 64px;
  }
  .ci__info {
    grid-area: info;
  }
  .ci__total {
    grid-area: total;
  }
}
</style>
