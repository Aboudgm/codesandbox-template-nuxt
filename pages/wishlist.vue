<template>
  <div class="container wl">
    <h1 class="wl__title">Your favourites</h1>
    <p class="muted wl__sub">
      Saved items you love. Add them to your basket whenever you're ready.
    </p>

    <div v-if="favourites.length" class="grid grid--products wl__grid">
      <ProductCard v-for="p in favourites" :key="p.id" :product="p" />
    </div>

    <div v-else class="wl__empty">
      <span>💚</span>
      <h2>No favourites yet</h2>
      <p class="muted">
        Tap the heart on any product to save it here for later.
      </p>
      <NuxtLink to="/shop" class="btn">Browse the market</NuxtLink>
    </div>
  </div>
</template>

<script>
import { products } from '~/data/products'

export default {
  name: 'WishlistPage',
  head: { title: 'Favourites — Capital Fresh' },
  computed: {
    favourites() {
      const ids = this.$store.state.wishlist
      return products.filter((p) => ids.includes(p.id))
    },
  },
}
</script>

<style scoped>
.wl {
  padding: 36px 20px 70px;
}
.wl__title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin-bottom: 4px;
}
.wl__sub {
  margin-bottom: 26px;
}
.wl__empty {
  text-align: center;
  padding: 70px 20px;
}
.wl__empty span {
  font-size: 4rem;
}
.wl__empty h2 {
  margin: 12px 0 4px;
}
.wl__empty .btn {
  margin-top: 16px;
}
</style>
