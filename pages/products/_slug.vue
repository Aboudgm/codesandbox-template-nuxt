<template>
  <div v-if="product" class="pdp">
    <div class="container">
      <nav class="crumbs">
        <NuxtLink to="/">Home</NuxtLink>
        <i class="fa-solid fa-chevron-right"></i>
        <NuxtLink to="/shop">Shop</NuxtLink>
        <i class="fa-solid fa-chevron-right"></i>
        <NuxtLink :to="`/shop?category=${product.category}`">{{
          categoryName
        }}</NuxtLink>
        <i class="fa-solid fa-chevron-right"></i>
        <span>{{ product.name }}</span>
      </nav>

      <div class="pdp__main">
        <div class="pdp__media" :style="{ background: gradient }">
          <span class="pdp__emoji">{{ product.emoji }}</span>
          <button
            class="pdp__fav"
            :class="{ 'is-active': inWishlist }"
            @click="toggleWishlist(product.id)"
          >
            <i
              :class="inWishlist ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"
            ></i>
          </button>
          <div class="pdp__badges">
            <span
              v-for="t in product.tags"
              :key="t"
              class="tag"
              :class="tagClass(t)"
              >{{ t }}</span
            >
          </div>
        </div>

        <div class="pdp__info">
          <div class="pdp__rating">
            <span class="stars">{{ starString }}</span>
            <span class="muted"
              >{{ product.rating }} · {{ product.reviews }} reviews</span
            >
          </div>
          <h1>{{ product.name }}</h1>
          <p class="pdp__origin">
            <i class="fa-solid fa-location-dot"></i> {{ product.origin }}
          </p>

          <div class="pdp__price">
            <span v-if="onSale" class="pdp__was"
              >${{ product.price.toFixed(2) }}</span
            >
            <span class="pdp__now">${{ price.toFixed(2) }}</span>
            <span class="pdp__unit">/ {{ product.unit }}</span>
            <span v-if="onSale" class="tag tag--sale"
              >Save ${{ (product.price - price).toFixed(2) }}</span
            >
          </div>

          <p class="pdp__desc">{{ product.description }}</p>

          <div class="pdp__buy">
            <QtyStepper v-model="qty" :min="1" />
            <button class="btn btn--accent pdp__add" @click="add">
              <i class="fa-solid fa-basket-shopping"></i>
              Add to basket · ${{ (price * qty).toFixed(2) }}
            </button>
          </div>

          <ul class="pdp__perks">
            <li>
              <i class="fa-solid fa-truck-fast"></i> Next-day delivery if you
              order by 6pm
            </li>
            <li>
              <i class="fa-solid fa-leaf"></i> Packed plastic-free in reusable
              crates
            </li>
            <li>
              <i class="fa-solid fa-shield-heart"></i> Freshness guarantee or
              your money back
            </li>
          </ul>

          <div class="pdp__tabs">
            <div class="pdp__tabbtns">
              <button
                v-for="t in tabs"
                :key="t"
                :class="{ 'is-active': tab === t }"
                @click="tab = t"
              >
                {{ t }}
              </button>
            </div>
            <div class="pdp__tabpanel">
              <p v-if="tab === 'Details'">
                {{ product.description }} Sourced from {{ product.origin }} and
                sold by the {{ product.unit }}.
              </p>
              <ul v-else-if="tab === 'Storage'" class="pdp__bullets">
                <li>Keep refrigerated below 4°C for best results.</li>
                <li>Store away from strong-smelling produce.</li>
                <li>Best enjoyed within 5–7 days of delivery.</li>
              </ul>
              <div v-else>
                <div
                  v-for="r in reviewSamples"
                  :key="r.name"
                  class="pdp__review"
                >
                  <div class="stars">★★★★★</div>
                  <p>"{{ r.text }}"</p>
                  <small class="muted">— {{ r.name }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Related -->
      <section v-if="related.length" class="pdp__related">
        <div class="sec-head">
          <h2 class="section-title">You might also like</h2>
        </div>
        <div class="grid grid--products">
          <ProductCard v-for="p in related" :key="p.id" :product="p" />
        </div>
      </section>
    </div>
  </div>

  <div v-else class="container notfound">
    <span>🍂</span>
    <h1>Product not found</h1>
    <p class="muted">That item may have sold out or moved.</p>
    <NuxtLink to="/shop" class="btn">Back to shop</NuxtLink>
  </div>
</template>

<script>
import {
  products,
  categories,
  productBySlug,
  effectivePrice,
} from '~/data/products'

export default {
  name: 'ProductDetail',
  data() {
    return {
      qty: 1,
      tab: 'Details',
      tabs: ['Details', 'Storage', 'Reviews'],
      reviewSamples: [
        { name: 'Sam', text: 'Super fresh and arrived perfectly packed.' },
        {
          name: 'Georgia',
          text: 'Best quality I’ve found in Canberra, hands down.',
        },
        { name: 'Tom', text: 'Lasted all week. Will be ordering again.' },
      ],
    }
  },
  head() {
    return {
      title: this.product
        ? `${this.product.name} — Capital Fresh`
        : 'Product — Capital Fresh',
    }
  },
  computed: {
    product() {
      return productBySlug(this.$route.params.slug)
    },
    price() {
      return this.product ? effectivePrice(this.product) : 0
    },
    onSale() {
      return this.product && this.product.salePrice != null
    },
    gradient() {
      if (!this.product) return ''
      const cat = categories.find((c) => c.slug === this.product.category)
      return (
        this.product.gradient || (cat && cat.gradient) || 'var(--green-100)'
      )
    },
    categoryName() {
      const cat = categories.find((c) => c.slug === this.product.category)
      return cat ? cat.name : ''
    },
    starString() {
      const full = Math.round(this.product.rating)
      return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full)
    },
    inWishlist() {
      return this.product && this.$store.getters.isInWishlist(this.product.id)
    },
    related() {
      if (!this.product) return []
      return products
        .filter(
          (p) =>
            p.category === this.product.category && p.id !== this.product.id
        )
        .slice(0, 4)
    },
  },
  watch: {
    '$route.params.slug'() {
      this.qty = 1
      this.tab = 'Details'
    },
  },
  methods: {
    add() {
      this.$store.dispatch('addToCart', {
        id: this.product.id,
        qty: this.qty,
        openCart: true,
      })
    },
    toggleWishlist(id) {
      this.$store.dispatch('toggleWishlist', id)
    },
    tagClass(t) {
      return {
        'tag--sale': t === 'sale',
        'tag--bestseller': t === 'bestseller',
        'tag--organic': t === 'organic',
        'tag--new': t === 'new',
      }
    },
  },
}
</script>

<style scoped>
.pdp {
  padding: 24px 0 60px;
}
.crumbs {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.82rem;
  color: var(--muted);
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.crumbs a:hover {
  color: var(--green-600);
}
.crumbs i {
  font-size: 0.6rem;
}
.pdp__main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}
.pdp__media {
  position: relative;
  border-radius: var(--radius-lg);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow);
  position: sticky;
  top: calc(var(--header-h) + 24px);
}
.pdp__emoji {
  font-size: clamp(7rem, 22vw, 13rem);
  filter: drop-shadow(0 20px 34px rgba(0, 0, 0, 0.18));
  animation: bob 6s ease-in-out infinite;
}
@keyframes bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}
.pdp__fav {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.92);
  color: var(--muted);
  font-size: 1.2rem;
}
.pdp__fav.is-active {
  color: var(--orange);
}
.pdp__badges {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pdp__rating {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
  margin-bottom: 8px;
}
.pdp__info h1 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin-bottom: 6px;
}
.pdp__origin {
  color: var(--muted);
  margin: 0 0 18px;
  font-size: 0.92rem;
}
.pdp__origin i {
  color: var(--green-600);
}
.pdp__price {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.pdp__was {
  text-decoration: line-through;
  color: var(--muted);
  font-size: 1.1rem;
}
.pdp__now {
  font-size: 2rem;
  font-weight: 700;
  color: var(--green-700);
  font-family: var(--font-display);
}
.pdp__unit {
  color: var(--muted);
}
.pdp__desc {
  font-size: 1.02rem;
  line-height: 1.65;
  margin-bottom: 24px;
}
.pdp__buy {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 22px;
  flex-wrap: wrap;
}
.pdp__add {
  flex: 1;
  min-width: 220px;
}
.pdp__perks {
  list-style: none;
  padding: 18px 0;
  margin: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.pdp__perks li {
  padding: 7px 0;
  font-size: 0.92rem;
}
.pdp__perks i {
  color: var(--green-600);
  width: 22px;
}
.pdp__tabs {
  margin-top: 24px;
}
.pdp__tabbtns {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 16px;
}
.pdp__tabbtns button {
  border: 0;
  background: transparent;
  padding: 10px 14px;
  font-weight: 600;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.pdp__tabbtns button.is-active {
  color: var(--green-700);
  border-bottom-color: var(--green-600);
}
.pdp__bullets {
  padding-left: 18px;
  color: var(--muted);
}
.pdp__bullets li {
  padding: 3px 0;
}
.pdp__review {
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}
.pdp__review p {
  margin: 4px 0;
}
.pdp__related {
  margin-top: 56px;
}
.pdp__related .sec-head {
  margin-bottom: 22px;
}

.notfound {
  text-align: center;
  padding: 90px 20px;
}
.notfound span {
  font-size: 4rem;
}
.notfound .btn {
  margin-top: 16px;
}

@media (max-width: 820px) {
  .pdp__main {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .pdp__media {
    position: relative;
    top: 0;
    max-width: 360px;
    margin: 0 auto;
  }
}
</style>
