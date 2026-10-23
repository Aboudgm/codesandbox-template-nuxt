<template>
  <div class="container checkout">
    <!-- Confirmation -->
    <div v-if="placed" class="confirm">
      <div class="confirm__icon">🎉</div>
      <h1>Order confirmed!</h1>
      <p class="muted">
        Thanks {{ form.firstName }} — your fresh order is on its way.
      </p>
      <div class="confirm__card card">
        <div class="confirm__row">
          <span>Order number</span><strong>{{ orderNo }}</strong>
        </div>
        <div class="confirm__row">
          <span>Delivery to</span
          ><strong
            >{{ form.address }}, {{ form.suburb }} {{ form.postcode }}</strong
          >
        </div>
        <div class="confirm__row">
          <span>Delivery date</span
          ><strong>{{ prettyDate }} · {{ form.slot }}</strong>
        </div>
        <div class="confirm__row confirm__row--total">
          <span>Total paid</span><strong>${{ paidTotal.toFixed(2) }}</strong>
        </div>
      </div>
      <p class="muted">A confirmation has been emailed to {{ form.email }}.</p>
      <NuxtLink to="/shop" class="btn">Continue shopping</NuxtLink>
    </div>

    <!-- Empty -->
    <div v-else-if="!cartLines.length" class="checkout__empty">
      <span>🧺</span>
      <h2>Nothing to check out</h2>
      <p class="muted">Add some fresh produce to your basket first.</p>
      <NuxtLink to="/shop" class="btn">Browse the market</NuxtLink>
    </div>

    <!-- Flow -->
    <div v-else>
      <h1 class="checkout__title">Checkout</h1>
      <ol class="steps-nav">
        <li v-for="(s, i) in stepLabels" :key="s" :class="stepClass(i + 1)">
          <span class="steps-nav__num">{{ i + 1 }}</span> {{ s }}
        </li>
      </ol>

      <div class="checkout__layout">
        <div class="checkout__form card">
          <!-- Step 1: details -->
          <div v-show="step === 1">
            <h3>Delivery details</h3>
            <div class="grid2">
              <label class="field">
                <span>First name</span>
                <input v-model="form.firstName" type="text" />
                <small v-if="errors.firstName">{{ errors.firstName }}</small>
              </label>
              <label class="field">
                <span>Last name</span>
                <input v-model="form.lastName" type="text" />
                <small v-if="errors.lastName">{{ errors.lastName }}</small>
              </label>
            </div>
            <div class="grid2">
              <label class="field">
                <span>Email</span>
                <input v-model="form.email" type="email" />
                <small v-if="errors.email">{{ errors.email }}</small>
              </label>
              <label class="field">
                <span>Phone</span>
                <input v-model="form.phone" type="tel" />
                <small v-if="errors.phone">{{ errors.phone }}</small>
              </label>
            </div>
            <label class="field">
              <span>Street address</span>
              <input v-model="form.address" type="text" />
              <small v-if="errors.address">{{ errors.address }}</small>
            </label>
            <div class="grid2">
              <label class="field">
                <span>Suburb</span>
                <input v-model="form.suburb" type="text" />
                <small v-if="errors.suburb">{{ errors.suburb }}</small>
              </label>
              <label class="field">
                <span>Postcode</span>
                <input v-model="form.postcode" type="text" maxlength="4" />
                <small v-if="errors.postcode">{{ errors.postcode }}</small>
              </label>
            </div>
            <div class="grid2">
              <label class="field">
                <span>Delivery date</span>
                <input v-model="form.date" type="date" :min="minDate" />
                <small v-if="errors.date">{{ errors.date }}</small>
              </label>
              <label class="field">
                <span>Time slot</span>
                <select v-model="form.slot">
                  <option>7am – 11am</option>
                  <option>11am – 3pm</option>
                  <option>3pm – 7pm</option>
                </select>
              </label>
            </div>
            <label class="field">
              <span>Delivery notes (optional)</span>
              <textarea
                v-model="form.notes"
                rows="2"
                placeholder="e.g. Leave at the front door, beware of dog"
              ></textarea>
            </label>
            <div class="checkout__nav">
              <NuxtLink to="/cart" class="btn btn--ghost"
                >Back to basket</NuxtLink
              >
              <button class="btn" @click="next">Continue to payment</button>
            </div>
          </div>

          <!-- Step 2: payment -->
          <div v-show="step === 2">
            <h3>Payment</h3>
            <div class="paynote">
              <i class="fa-solid fa-circle-info"></i> Demo store — no real
              payment is taken. Use any details.
            </div>
            <div class="paymethods">
              <button
                v-for="m in payMethods"
                :key="m.id"
                class="paymethod"
                :class="{ 'is-active': form.payMethod === m.id }"
                @click="form.payMethod = m.id"
              >
                <i :class="m.icon"></i> {{ m.label }}
              </button>
            </div>

            <div v-if="form.payMethod === 'card'">
              <label class="field">
                <span>Card number</span>
                <input
                  v-model="form.card"
                  type="text"
                  placeholder="4242 4242 4242 4242"
                />
                <small v-if="errors.card">{{ errors.card }}</small>
              </label>
              <div class="grid2">
                <label class="field">
                  <span>Expiry</span>
                  <input
                    v-model="form.expiry"
                    type="text"
                    placeholder="MM/YY"
                  />
                </label>
                <label class="field">
                  <span>CVC</span>
                  <input v-model="form.cvc" type="text" placeholder="123" />
                </label>
              </div>
            </div>
            <div v-else class="paywallet">
              <p class="muted">
                You'll be redirected to {{ payLabel }} to approve this payment.
              </p>
            </div>

            <div class="checkout__nav">
              <button class="btn btn--ghost" @click="step = 1">Back</button>
              <button class="btn" @click="next">Review order</button>
            </div>
          </div>

          <!-- Step 3: review -->
          <div v-show="step === 3">
            <h3>Review &amp; place order</h3>
            <div class="review-block">
              <h4>Delivering to</h4>
              <p>
                {{ form.firstName }} {{ form.lastName }}<br />
                {{ form.address }}, {{ form.suburb }} {{ form.postcode }}<br />
                {{ form.phone }} · {{ form.email }}
              </p>
              <p class="muted">
                {{ prettyDate }} · {{ form.slot }}
                <template v-if="form.notes"
                  ><br />Note: {{ form.notes }}</template
                >
              </p>
            </div>
            <div class="review-block">
              <h4>Items ({{ cartCount }})</h4>
              <div v-for="line in cartLines" :key="line.id" class="review-item">
                <span
                  >{{ line.product.emoji }} {{ line.product.name }} ×
                  {{ line.qty }}</span
                >
                <span>${{ line.lineTotal.toFixed(2) }}</span>
              </div>
            </div>
            <label class="agree">
              <input v-model="form.agree" type="checkbox" />
              <span>I agree to the freshness guarantee &amp; terms.</span>
            </label>
            <small v-if="errors.agree" class="err-line">{{
              errors.agree
            }}</small>
            <div class="checkout__nav">
              <button class="btn btn--ghost" @click="step = 2">Back</button>
              <button
                class="btn btn--accent"
                :disabled="placing"
                @click="placeOrder"
              >
                <i v-if="placing" class="fa-solid fa-spinner fa-spin"></i>
                {{ placing ? 'Placing order…' : `Pay $${total.toFixed(2)}` }}
              </button>
            </div>
          </div>
        </div>

        <!-- summary -->
        <aside class="checkout__summary card">
          <h3>Your order</h3>
          <div class="os-list">
            <div v-for="line in cartLines" :key="line.id" class="os-item">
              <span
                class="os-item__emoji"
                :style="{ background: gradientFor(line.product) }"
                >{{ line.product.emoji }}</span
              >
              <span class="os-item__name"
                >{{ line.product.name }} <small>× {{ line.qty }}</small></span
              >
              <span class="os-item__price"
                >${{ line.lineTotal.toFixed(2) }}</span
              >
            </div>
          </div>
          <div class="os-rows">
            <div class="os-row">
              <span>Subtotal</span><span>${{ subtotal.toFixed(2) }}</span>
            </div>
            <div v-if="subscriptionDiscount > 0" class="os-row os-row--save">
              <span>Subscription saving</span
              ><span>−${{ subscriptionDiscount.toFixed(2) }}</span>
            </div>
            <div class="os-row">
              <span>Delivery</span>
              <span>{{
                deliveryFee === 0 ? 'FREE' : '$' + deliveryFee.toFixed(2)
              }}</span>
            </div>
            <div class="os-row os-row--total">
              <span>Total</span><span>${{ total.toFixed(2) }}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { categories } from '~/data/products'

export default {
  name: 'CheckoutPage',
  data() {
    return {
      step: 1,
      placing: false,
      placed: false,
      orderNo: '',
      paidTotal: 0,
      stepLabels: ['Details', 'Payment', 'Review'],
      payMethods: [
        { id: 'card', label: 'Card', icon: 'fa-solid fa-credit-card' },
        { id: 'paypal', label: 'PayPal', icon: 'fa-brands fa-paypal' },
        { id: 'applepay', label: 'Apple Pay', icon: 'fa-brands fa-apple-pay' },
      ],
      form: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        suburb: '',
        postcode: '',
        date: '',
        slot: '7am – 11am',
        notes: '',
        payMethod: 'card',
        card: '',
        expiry: '',
        cvc: '',
        agree: false,
      },
      errors: {},
    }
  },
  computed: {
    ...mapGetters([
      'cartLines',
      'cartCount',
      'subtotal',
      'deliveryFee',
      'subscriptionDiscount',
      'total',
    ]),
    minDate() {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return d.toISOString().slice(0, 10)
    },
    prettyDate() {
      if (!this.form.date) return ''
      return new Date(this.form.date + 'T00:00:00').toLocaleDateString(
        'en-AU',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }
      )
    },
    payLabel() {
      const m = this.payMethods.find((x) => x.id === this.form.payMethod)
      return m ? m.label : ''
    },
  },
  mounted() {
    this.form.date = this.minDate
  },
  methods: {
    stepClass(n) {
      return {
        'is-active': this.step === n,
        'is-done': this.step > n,
      }
    },
    validateStep1() {
      const e = {}
      const f = this.form
      if (!f.firstName.trim()) e.firstName = 'Required'
      if (!f.lastName.trim()) e.lastName = 'Required'
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(f.email)) e.email = 'Enter a valid email'
      if (!/^[\d +()-]{8,}$/.test(f.phone)) e.phone = 'Enter a valid phone'
      if (!f.address.trim()) e.address = 'Required'
      if (!f.suburb.trim()) e.suburb = 'Required'
      if (!/^\d{4}$/.test(f.postcode)) e.postcode = '4-digit postcode'
      if (!f.date) e.date = 'Pick a date'
      this.errors = e
      return Object.keys(e).length === 0
    },
    validateStep2() {
      const e = {}
      if (this.form.payMethod === 'card') {
        const digits = this.form.card.replace(/\s/g, '')
        if (!/^\d{12,19}$/.test(digits)) e.card = 'Enter a valid card number'
      }
      this.errors = e
      return Object.keys(e).length === 0
    },
    next() {
      if (this.step === 1 && !this.validateStep1()) return
      if (this.step === 2 && !this.validateStep2()) return
      this.step += 1
      if (process.client) window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    placeOrder() {
      if (!this.form.agree) {
        this.errors = { agree: 'Please accept the terms to continue.' }
        return
      }
      this.errors = {}
      this.placing = true
      this.paidTotal = this.total
      setTimeout(() => {
        this.orderNo =
          'CF-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        this.placing = false
        this.placed = true
        this.$store.commit('CLEAR_CART')
        this.$store.dispatch('notify', {
          type: 'success',
          message: '🎉 Order placed! Check your inbox.',
        })
        if (process.client) window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 1200)
    },
    gradientFor(product) {
      const cat = categories.find((c) => c.slug === product.category)
      return product.gradient || (cat && cat.gradient) || 'var(--green-100)'
    },
  },
}
</script>

<style scoped>
.checkout {
  padding: 36px 20px 70px;
}
.checkout__title {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  margin-bottom: 20px;
}
.steps-nav {
  display: flex;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0 0 26px;
  flex-wrap: wrap;
}
.steps-nav li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--muted);
  font-weight: 600;
  font-size: 0.9rem;
}
.steps-nav__num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--line);
  color: var(--muted);
  display: grid;
  place-items: center;
  font-size: 0.78rem;
}
.steps-nav li.is-active {
  border-color: var(--green-600);
  color: var(--green-700);
}
.steps-nav li.is-active .steps-nav__num {
  background: var(--green-600);
  color: #fff;
}
.steps-nav li.is-done .steps-nav__num {
  background: var(--green-500);
  color: #fff;
}

.checkout__layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 28px;
  align-items: start;
}
.checkout__form {
  padding: 26px;
}
.checkout__form h3 {
  margin-bottom: 18px;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.field {
  display: block;
  margin-bottom: 14px;
}
.field span {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
}
.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-family: inherit;
  font-size: 0.95rem;
  outline: 0;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: var(--green-600);
  box-shadow: 0 0 0 3px var(--green-100);
}
.field small {
  color: var(--danger);
  font-size: 0.78rem;
  display: block;
  margin-top: 4px;
}
.checkout__nav {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  flex-wrap: wrap;
}
.paynote {
  background: #eef6fd;
  color: #1e6fc4;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 0.85rem;
  margin-bottom: 18px;
}
.paymethods {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.paymethod {
  flex: 1;
  min-width: 100px;
  border: 1.5px solid var(--line);
  background: #fff;
  border-radius: var(--radius-sm);
  padding: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.paymethod.is-active {
  border-color: var(--green-600);
  background: var(--green-50);
  color: var(--green-700);
}
.paywallet {
  background: var(--green-50);
  border-radius: var(--radius-sm);
  padding: 18px;
}
.review-block {
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
  margin-bottom: 14px;
}
.review-block h4 {
  font-family: var(--font-body);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-bottom: 8px;
}
.review-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.92rem;
}
.agree {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0;
}
.agree input {
  width: 18px;
  height: 18px;
  accent-color: var(--green-600);
}
.err-line {
  color: var(--danger);
  font-size: 0.8rem;
}

/* summary */
.checkout__summary {
  padding: 22px;
  position: sticky;
  top: calc(var(--header-h) + 24px);
}
.checkout__summary h3 {
  margin-bottom: 14px;
}
.os-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
  margin-bottom: 14px;
}
.os-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
}
.os-item__emoji {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  flex: none;
}
.os-item__name {
  flex: 1;
}
.os-item__name small {
  color: var(--muted);
}
.os-item__price {
  font-weight: 600;
}
.os-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.os-row--save {
  color: var(--green-600);
  font-weight: 600;
}
.os-row--total {
  color: var(--ink);
  font-weight: 700;
  font-size: 1.2rem;
  border-top: 1px dashed var(--line);
  margin-top: 6px;
  padding-top: 10px;
}

/* confirm + empty */
.confirm,
.checkout__empty {
  text-align: center;
  padding: 50px 20px 70px;
  max-width: 560px;
  margin: 0 auto;
}
.confirm__icon {
  font-size: 4rem;
}
.checkout__empty span {
  font-size: 4rem;
}
.confirm h1 {
  margin: 10px 0 4px;
}
.confirm__card {
  text-align: left;
  padding: 22px;
  margin: 24px 0;
}
.confirm__row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.confirm__row:last-child {
  border-bottom: 0;
}
.confirm__row--total {
  font-size: 1.15rem;
  color: var(--green-700);
}
.confirm .btn,
.checkout__empty .btn {
  margin-top: 12px;
}

@media (max-width: 820px) {
  .checkout__layout {
    grid-template-columns: 1fr;
  }
  .checkout__summary {
    position: relative;
    top: 0;
    order: -1;
  }
}
@media (max-width: 480px) {
  .grid2 {
    grid-template-columns: 1fr;
  }
}
</style>
