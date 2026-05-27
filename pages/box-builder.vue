<template>
  <div class="bb">
    <div class="bb__hero">
      <div class="container">
        <span class="eyebrow"
          ><i class="fa-solid fa-wand-magic-sparkles"></i> Make it yours</span
        >
        <h1>Build your own fresh box</h1>
        <p class="muted">
          Pick a target size, tap to add your favourites, and watch your box
          fill up. We'll pack it fresh and deliver to your door.
        </p>
      </div>
    </div>

    <div class="container bb__layout">
      <!-- Picker -->
      <div class="bb__picker">
        <div class="bb__sizes">
          <button
            v-for="s in sizes"
            :key="s.value"
            class="bb__size"
            :class="{ 'is-active': target === s.value }"
            @click="target = s.value"
          >
            <span class="bb__size-emoji">{{ s.emoji }}</span>
            <strong>{{ s.label }}</strong>
            <small>~${{ s.value }}</small>
          </button>
        </div>

        <div class="bb__cats">
          <button
            v-for="c in catTabs"
            :key="c.slug"
            :class="{ 'is-active': activeCat === c.slug }"
            @click="activeCat = c.slug"
          >
            {{ c.emoji }} {{ c.name }}
          </button>
        </div>

        <div class="grid grid--products bb__grid">
          <div
            v-for="p in pickable"
            :key="p.id"
            class="bb-tile"
            :class="{ 'is-in': qtyFor(p.id) > 0 }"
            :style="{ background: gradientFor(p) }"
            @click="addItem(p)"
          >
            <span class="bb-tile__emoji">{{ p.emoji }}</span>
            <span class="bb-tile__name">{{ p.name }}</span>
            <span class="bb-tile__price">${{ price(p).toFixed(2) }}</span>
            <span v-if="qtyFor(p.id) > 0" class="bb-tile__count">{{
              qtyFor(p.id)
            }}</span>
          </div>
        </div>
      </div>

      <!-- Box -->
      <aside class="bb__box card">
        <div class="bb__box-head">
          <h3>🧺 Your box</h3>
          <button v-if="items.length" class="bb__clear" @click="clearBox">
            Clear
          </button>
        </div>

        <div class="bb__meter">
          <div class="bb__meter-top">
            <span>${{ boxTotal.toFixed(2) }}</span>
            <span class="muted">target ${{ target }}</span>
          </div>
          <div class="bb__track">
            <div
              class="bb__fill"
              :class="{ 'is-over': boxTotal > target }"
              :style="{ width: fillPct + '%' }"
            ></div>
          </div>
          <p class="bb__meter-msg" :class="meterClass">
            <i :class="meterIcon"></i> {{ meterMsg }}
          </p>
        </div>

        <div v-if="items.length" class="bb__items">
          <div v-for="line in items" :key="line.id" class="bb-line">
            <span class="bb-line__emoji">{{ line.product.emoji }}</span>
            <span class="bb-line__name">{{ line.product.name }}</span>
            <QtyStepper
              small
              :value="line.qty"
              @change="(q) => setQty(line.id, q)"
            />
            <span class="bb-line__price"
              >${{ (price(line.product) * line.qty).toFixed(2) }}</span
            >
          </div>
        </div>
        <p v-else class="bb__empty muted">
          Tap any item to start filling your box 👆
        </p>

        <div class="bb__freq">
          <button
            v-for="f in freqs"
            :key="f.value"
            :class="{ 'is-active': frequency === f.value }"
            @click="frequency = f.value"
          >
            {{ f.label }}<small v-if="f.value !== 'one-off'"> · save 10%</small>
          </button>
        </div>

        <button
          class="btn btn--block btn--accent"
          :disabled="!items.length"
          @click="addBoxToCart"
        >
          <i class="fa-solid fa-basket-shopping"></i>
          Add box to basket · ${{ boxTotal.toFixed(2) }}
        </button>
      </aside>
    </div>
  </div>
</template>

<script>
import { products, categories, effectivePrice } from '~/data/products'

export default {
  name: 'BoxBuilder',
  data() {
    return {
      target: 45,
      activeCat: 'fruit',
      frequency: 'weekly',
      // local box state: { id, qty }
      box: [],
      sizes: [
        { value: 30, label: 'Small', emoji: '🥡' },
        { value: 45, label: 'Medium', emoji: '📦' },
        { value: 65, label: 'Large', emoji: '🧺' },
        { value: 90, label: 'Family', emoji: '🛒' },
      ],
      freqs: [
        { value: 'one-off', label: 'One-off' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'fortnightly', label: 'Fortnightly' },
      ],
    }
  },
  computed: {
    catTabs() {
      return categories.filter((c) => c.slug !== 'boxes')
    },
    pickable() {
      return products.filter(
        (p) => p.category === this.activeCat && p.category !== 'boxes'
      )
    },
    items() {
      return this.box
        .map((b) => {
          const product = products.find((p) => p.id === b.id)
          return product ? { ...b, product } : null
        })
        .filter(Boolean)
    },
    boxTotal() {
      return +this.items
        .reduce((sum, l) => sum + effectivePrice(l.product) * l.qty, 0)
        .toFixed(2)
    },
    fillPct() {
      return Math.min(100, (this.boxTotal / this.target) * 100)
    },
    meterClass() {
      if (this.boxTotal === 0) return 'muted'
      if (this.boxTotal > this.target) return 'is-over'
      if (this.fillPct >= 90) return 'is-ready'
      return ''
    },
    meterIcon() {
      if (this.boxTotal > this.target) return 'fa-solid fa-circle-exclamation'
      if (this.fillPct >= 90) return 'fa-solid fa-circle-check'
      return 'fa-solid fa-box-open'
    },
    meterMsg() {
      if (this.boxTotal === 0) return 'Your box is empty'
      if (this.boxTotal > this.target)
        return `$${(this.boxTotal - this.target).toFixed(
          2
        )} over your target — nice and full!`
      if (this.fillPct >= 90) return 'Looking great — ready to go!'
      return `Add $${(this.target - this.boxTotal).toFixed(
        2
      )} more to hit your target`
    },
  },
  methods: {
    price(p) {
      return effectivePrice(p)
    },
    qtyFor(id) {
      const b = this.box.find((x) => x.id === id)
      return b ? b.qty : 0
    },
    addItem(p) {
      const b = this.box.find((x) => x.id === p.id)
      if (b) b.qty += 1
      else this.box.push({ id: p.id, qty: 1 })
    },
    setQty(id, qty) {
      if (qty <= 0) {
        this.box = this.box.filter((x) => x.id !== id)
      } else {
        const b = this.box.find((x) => x.id === id)
        if (b) b.qty = qty
      }
    },
    clearBox() {
      this.box = []
    },
    gradientFor(p) {
      const cat = categories.find((c) => c.slug === p.category)
      return p.gradient || (cat && cat.gradient) || 'var(--green-100)'
    },
    addBoxToCart() {
      this.box.forEach((b) =>
        this.$store.commit('ADD_TO_CART', { id: b.id, qty: b.qty })
      )
      this.$store.commit('SET_DELIVERY_FREQUENCY', this.frequency)
      this.$store.dispatch('notify', {
        type: 'success',
        message: `🧺 Your custom box (${this.items.length} items) is in the basket!`,
      })
      this.$store.commit('SET_CART_OPEN', true)
      this.box = []
    },
  },
}
</script>

<style scoped>
.bb__hero {
  background: var(--green-50);
  padding: 40px 0 28px;
  border-bottom: 1px solid var(--line);
}
.bb__hero h1 {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  margin-bottom: 4px;
}
.bb__layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 28px;
  align-items: start;
  padding-top: 28px;
  padding-bottom: 60px;
}
.bb__sizes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}
.bb__size {
  border: 1.5px solid var(--line);
  background: #fff;
  border-radius: var(--radius);
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: border-color 0.15s ease, transform 0.12s ease;
}
.bb__size:hover {
  transform: translateY(-2px);
}
.bb__size.is-active {
  border-color: var(--green-600);
  background: var(--green-50);
}
.bb__size-emoji {
  font-size: 1.7rem;
}
.bb__size small {
  color: var(--muted);
}
.bb__cats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.bb__cats button {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 999px;
  padding: 8px 15px;
  font-weight: 600;
  font-size: 0.88rem;
}
.bb__cats button.is-active {
  background: var(--green-600);
  color: #fff;
  border-color: var(--green-600);
}

.bb-tile {
  position: relative;
  border-radius: var(--radius);
  padding: 16px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  border: 2px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease,
    border-color 0.15s ease;
  user-select: none;
}
.bb-tile:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
.bb-tile.is-in {
  border-color: var(--green-700);
}
.bb-tile__emoji {
  font-size: 2.6rem;
}
.bb-tile__name {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--green-900);
  line-height: 1.2;
}
.bb-tile__price {
  font-weight: 700;
  color: var(--green-900);
  font-size: 0.85rem;
}
.bb-tile__count {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--green-700);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: var(--shadow-sm);
}

/* Box panel */
.bb__box {
  padding: 22px;
  position: sticky;
  top: calc(var(--header-h) + 24px);
}
.bb__box-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.bb__box-head h3 {
  margin: 0;
}
.bb__clear {
  border: 0;
  background: transparent;
  color: var(--muted);
  text-decoration: underline;
  font-size: 0.82rem;
}
.bb__meter {
  margin-bottom: 16px;
}
.bb__meter-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--green-700);
  margin-bottom: 6px;
}
.bb__meter-top .muted {
  font-size: 0.85rem;
  font-weight: 500;
}
.bb__track {
  height: 10px;
  border-radius: 999px;
  background: #e1ede2;
  overflow: hidden;
}
.bb__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--green-500), var(--green-600));
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.bb__fill.is-over {
  background: linear-gradient(90deg, var(--amber), var(--orange));
}
.bb__meter-msg {
  font-size: 0.84rem;
  margin: 8px 0 0;
}
.bb__meter-msg.is-ready {
  color: var(--green-600);
  font-weight: 600;
}
.bb__meter-msg.is-over {
  color: var(--orange-dark);
  font-weight: 600;
}
.bb__items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 14px 0;
  margin-bottom: 14px;
}
.bb-line {
  display: grid;
  grid-template-columns: 30px 1fr auto auto;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}
.bb-line__emoji {
  font-size: 1.3rem;
}
.bb-line__name {
  line-height: 1.15;
}
.bb-line__price {
  font-weight: 700;
  min-width: 48px;
  text-align: right;
}
.bb__empty {
  text-align: center;
  padding: 24px 10px;
}
.bb__freq {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 14px;
}
.bb__freq button {
  border: 1.5px solid var(--line);
  background: #fff;
  border-radius: var(--radius-sm);
  padding: 8px 4px;
  font-size: 0.74rem;
  font-weight: 600;
}
.bb__freq button.is-active {
  border-color: var(--green-600);
  background: var(--green-50);
}
.bb__freq small {
  color: var(--green-600);
}

@media (max-width: 860px) {
  .bb__layout {
    grid-template-columns: 1fr;
  }
  .bb__box {
    position: relative;
    top: 0;
    order: -1;
  }
}
@media (max-width: 460px) {
  .bb__sizes {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
