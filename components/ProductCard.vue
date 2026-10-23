<template>
  <article class="pcard">
    <NuxtLink
      :to="`/products/${product.slug}`"
      class="pcard__media"
      :style="bgStyle"
    >
      <span class="pcard__emoji">{{ product.emoji }}</span>
      <div class="pcard__badges">
        <span
          v-for="t in displayTags"
          :key="t"
          class="tag"
          :class="tagClass(t)"
          >{{ t }}</span
        >
      </div>
      <button
        class="pcard__fav"
        :class="{ 'is-active': inWishlist }"
        :aria-label="
          inWishlist ? 'Remove from favourites' : 'Add to favourites'
        "
        @click.prevent="toggleWishlist(product.id)"
      >
        <i
          :class="inWishlist ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"
        ></i>
      </button>
    </NuxtLink>

    <div class="pcard__body">
      <div class="pcard__meta">
        <span class="stars">{{ starString }}</span>
        <span class="pcard__reviews">({{ product.reviews }})</span>
      </div>
      <h3 class="pcard__title">
        <NuxtLink :to="`/products/${product.slug}`">{{
          product.name
        }}</NuxtLink>
      </h3>
      <p class="pcard__unit">{{ product.unit }}</p>

      <div class="pcard__foot">
        <div class="pcard__price">
          <span v-if="onSale" class="pcard__was"
            >${{ product.price.toFixed(2) }}</span
          >
          <span class="pcard__now">${{ price.toFixed(2) }}</span>
        </div>

        <template v-if="qtyInCart === 0">
          <button class="pcard__add" aria-label="Add to basket" @click="add">
            <i class="fa-solid fa-plus"></i>
          </button>
        </template>
        <QtyStepper v-else small :value="qtyInCart" @change="setQty" />
      </div>
    </div>
  </article>
</template>

<script>
import { mapGetters } from 'vuex'
import { effectivePrice, categories } from '~/data/products'

export default {
  name: 'ProductCard',
  props: {
    product: { type: Object, required: true },
  },
  computed: {
    ...mapGetters(['isInWishlist']),
    price() {
      return effectivePrice(this.product)
    },
    onSale() {
      return this.product.salePrice != null
    },
    inWishlist() {
      return this.isInWishlist(this.product.id)
    },
    qtyInCart() {
      return this.$store.getters.qtyInCart(this.product.id)
    },
    bgStyle() {
      const cat = categories.find((c) => c.slug === this.product.category)
      return {
        background:
          this.product.gradient || (cat && cat.gradient) || 'var(--green-100)',
      }
    },
    starString() {
      const full = Math.round(this.product.rating)
      return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full)
    },
    displayTags() {
      return (this.product.tags || []).slice(0, 2)
    },
  },
  methods: {
    add() {
      this.$store.dispatch('addToCart', { id: this.product.id, qty: 1 })
    },
    setQty(qty) {
      this.$store.commit('SET_QTY', { id: this.product.id, qty })
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
.pcard {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.pcard:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}
.pcard__media {
  position: relative;
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.pcard__emoji {
  font-size: clamp(3rem, 8vw, 4.6rem);
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.12));
  transition: transform 0.3s ease;
}
.pcard:hover .pcard__emoji {
  transform: scale(1.12) rotate(-4deg);
}
.pcard__badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-width: 80%;
}
.pcard__fav {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.9);
  color: var(--muted);
  display: grid;
  place-items: center;
  backdrop-filter: blur(4px);
  transition: transform 0.15s ease, color 0.15s ease;
}
.pcard__fav:hover {
  transform: scale(1.12);
}
.pcard__fav.is-active {
  color: var(--orange);
}
.pcard__body {
  padding: 14px 14px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.pcard__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--muted);
  margin-bottom: 2px;
}
.pcard__title {
  font-size: 1.02rem;
  margin: 0 0 2px;
  line-height: 1.2;
}
.pcard__title a:hover {
  color: var(--green-600);
}
.pcard__unit {
  margin: 0 0 12px;
  font-size: 0.8rem;
  color: var(--muted);
}
.pcard__foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pcard__price {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.pcard__was {
  font-size: 0.78rem;
  color: var(--muted);
  text-decoration: line-through;
}
.pcard__now {
  font-weight: 700;
  font-size: 1.12rem;
  color: var(--green-700);
}
.pcard__add {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 0;
  background: var(--green-600);
  color: #fff;
  font-size: 0.95rem;
  box-shadow: 0 6px 16px rgba(47, 158, 87, 0.32);
  transition: transform 0.15s ease, background 0.2s ease;
}
.pcard__add:hover {
  background: var(--green-700);
  transform: scale(1.08);
}
.pcard__add:active {
  transform: scale(0.92);
}
</style>
