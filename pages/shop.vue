<template>
  <div class="shop">
    <div class="shop__hero">
      <div class="container">
        <span class="eyebrow"
          ><i class="fa-solid fa-store"></i> The market</span
        >
        <h1>{{ activeCategory ? activeCategory.name : 'Shop all produce' }}</h1>
        <p class="muted">
          {{
            activeCategory
              ? activeCategory.blurb
              : 'Everything we sell, picked fresh and ready to deliver.'
          }}
        </p>
      </div>
    </div>

    <div class="container shop__layout">
      <!-- Filters -->
      <aside class="filters" :class="{ 'filters--open': filtersOpen }">
        <div class="filters__head">
          <h3>Filters</h3>
          <button class="filters__close" @click="filtersOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="filters__group">
          <h4>Category</h4>
          <label class="check">
            <input
              type="radio"
              value=""
              :checked="category === ''"
              @change="setCategory('')"
            />
            <span>All produce</span>
          </label>
          <label v-for="c in categories" :key="c.slug" class="check">
            <input
              type="radio"
              :value="c.slug"
              :checked="category === c.slug"
              @change="setCategory(c.slug)"
            />
            <span>{{ c.emoji }} {{ c.name }}</span>
          </label>
        </div>

        <div class="filters__group">
          <h4>Tags</h4>
          <label v-for="t in allTags" :key="t" class="check">
            <input
              type="checkbox"
              :value="t"
              :checked="selectedTags.includes(t)"
              @change="toggleTag(t)"
            />
            <span class="cap">{{ t }}</span>
          </label>
        </div>

        <div class="filters__group">
          <h4>Max price: ${{ maxPrice }}</h4>
          <input
            v-model.number="maxPrice"
            type="range"
            min="1"
            :max="priceCeiling"
            step="1"
            class="range"
          />
        </div>

        <button class="btn btn--ghost btn--block btn--sm" @click="resetFilters">
          Reset filters
        </button>
      </aside>

      <!-- Results -->
      <div class="results">
        <div class="results__bar">
          <button class="results__filterbtn" @click="filtersOpen = true">
            <i class="fa-solid fa-sliders"></i> Filters
          </button>
          <span class="results__count"
            >{{ filtered.length }}
            {{ filtered.length === 1 ? 'product' : 'products' }}</span
          >
          <div class="results__sort">
            <label for="sort">Sort</label>
            <select id="sort" v-model="sort">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Top rated</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        <div v-if="query" class="results__searchnote">
          Showing results for "<strong>{{ query }}</strong
          >"
          <button @click="clearSearch">clear</button>
        </div>

        <div v-if="filtered.length" class="grid grid--products">
          <ProductCard v-for="p in filtered" :key="p.id" :product="p" />
        </div>
        <div v-else class="results__empty">
          <span>🔍</span>
          <h3>No matches found</h3>
          <p class="muted">Try adjusting your filters or search term.</p>
          <button class="btn" @click="resetFilters">Reset filters</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { products, categories, effectivePrice } from '~/data/products'

export default {
  name: 'ShopPage',
  data() {
    return {
      categories,
      category: '',
      selectedTags: [],
      query: '',
      sort: 'featured',
      maxPrice: 80,
      priceCeiling: 80,
      filtersOpen: false,
    }
  },
  computed: {
    allTags() {
      const set = new Set()
      products.forEach((p) => p.tags.forEach((t) => set.add(t)))
      return [...set].sort()
    },
    activeCategory() {
      return categories.find((c) => c.slug === this.category) || null
    },
    filtered() {
      let list = products.slice()
      if (this.category) list = list.filter((p) => p.category === this.category)
      if (this.selectedTags.length)
        list = list.filter((p) =>
          this.selectedTags.every((t) => p.tags.includes(t))
        )
      list = list.filter((p) => effectivePrice(p) <= this.maxPrice)
      if (this.query) {
        const q = this.query.toLowerCase()
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.includes(q)
        )
      }
      switch (this.sort) {
        case 'price-asc':
          list.sort((a, b) => effectivePrice(a) - effectivePrice(b))
          break
        case 'price-desc':
          list.sort((a, b) => effectivePrice(b) - effectivePrice(a))
          break
        case 'rating':
          list.sort((a, b) => b.rating - a.rating)
          break
        case 'name':
          list.sort((a, b) => a.name.localeCompare(b.name))
          break
        default:
          list.sort(
            (a, b) =>
              Number(b.tags.includes('bestseller')) -
                Number(a.tags.includes('bestseller')) || b.reviews - a.reviews
          )
      }
      return list
    },
  },
  watch: {
    '$route.query': {
      handler() {
        this.syncFromQuery()
      },
    },
    filtersOpen(v) {
      if (process.client) document.body.style.overflow = v ? 'hidden' : ''
    },
  },
  created() {
    const ceiling = Math.ceil(Math.max(...products.map((p) => p.price)) + 5)
    this.priceCeiling = ceiling
    this.maxPrice = ceiling
    this.syncFromQuery()
  },
  methods: {
    syncFromQuery() {
      const q = this.$route.query
      this.category = q.category || ''
      this.query = q.q || ''
      if (q.tag) this.selectedTags = [q.tag]
    },
    setCategory(slug) {
      this.category = slug
      this.pushQuery()
      this.filtersOpen = false
    },
    toggleTag(t) {
      const i = this.selectedTags.indexOf(t)
      if (i >= 0) this.selectedTags.splice(i, 1)
      else this.selectedTags.push(t)
    },
    clearSearch() {
      this.query = ''
      this.pushQuery()
    },
    resetFilters() {
      this.category = ''
      this.selectedTags = []
      this.query = ''
      this.maxPrice = this.priceCeiling
      this.sort = 'featured'
      this.pushQuery()
      this.filtersOpen = false
    },
    pushQuery() {
      const query = {}
      if (this.category) query.category = this.category
      if (this.query) query.q = this.query
      this.$router.push({ path: '/shop', query }).catch(() => {})
    },
  },
}
</script>

<style scoped>
.shop__hero {
  background: var(--green-50);
  padding: 40px 0 28px;
  border-bottom: 1px solid var(--line);
}
.shop__hero h1 {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  margin-bottom: 4px;
}
.shop__layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 28px;
  padding-top: 28px;
  padding-bottom: 60px;
  align-items: start;
}

/* Filters */
.filters {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px;
  position: sticky;
  top: calc(var(--header-h) + 30px);
}
.filters__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.filters__head h3 {
  margin: 0;
  font-size: 1.2rem;
}
.filters__close {
  display: none;
  border: 0;
  background: transparent;
  font-size: 1.3rem;
}
.filters__group {
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
.filters__group:last-of-type {
  border-bottom: 0;
}
.filters__group h4 {
  font-family: var(--font-body);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 10px;
}
.check {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 0.92rem;
}
.check input {
  accent-color: var(--green-600);
  width: 17px;
  height: 17px;
}
.cap {
  text-transform: capitalize;
}
.range {
  width: 100%;
  accent-color: var(--green-600);
}

/* Results */
.results__bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.results__filterbtn {
  display: none;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 999px;
  padding: 9px 16px;
  font-weight: 600;
}
.results__count {
  color: var(--muted);
  font-size: 0.9rem;
}
.results__sort {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}
.results__sort select {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 14px;
  font-family: inherit;
  background: #fff;
  outline: 0;
}
.results__searchnote {
  background: var(--green-50);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}
.results__searchnote button {
  border: 0;
  background: transparent;
  color: var(--green-700);
  text-decoration: underline;
  margin-left: 6px;
}
.results__empty {
  text-align: center;
  padding: 60px 20px;
}
.results__empty span {
  font-size: 3rem;
}
.results__empty h3 {
  margin: 12px 0 4px;
}
.results__empty .btn {
  margin-top: 14px;
}

@media (max-width: 860px) {
  .shop__layout {
    grid-template-columns: 1fr;
  }
  .filters {
    position: fixed;
    inset: 0;
    z-index: 1080;
    border-radius: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
  }
  .filters--open {
    transform: translateX(0);
  }
  .filters__close {
    display: block;
  }
  .results__filterbtn {
    display: inline-flex;
  }
}
</style>
