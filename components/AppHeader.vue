<template>
  <div class="header-wrap">
    <!-- Announcement bar -->
    <div class="announce">
      <div class="container announce__inner">
        <transition name="fade" mode="out-in">
          <span :key="annIndex">
            <i :class="announcements[annIndex].icon"></i>
            {{ announcements[annIndex].text }}
          </span>
        </transition>
      </div>
    </div>

    <header class="header" :class="{ 'header--scrolled': scrolled }">
      <div class="container header__inner">
        <button
          class="header__burger"
          aria-label="Open menu"
          @click="setMobileNav(true)"
        >
          <i class="fa-solid fa-bars"></i>
        </button>

        <NuxtLink to="/" class="brand" @click.native="setMobileNav(false)">
          <span class="brand__mark">🥬</span>
          <span class="brand__text"
            >Capital<span class="brand__accent">Fresh</span></span
          >
        </NuxtLink>

        <nav class="nav">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="nav__link"
            >{{ link.label }}</NuxtLink
          >
        </nav>

        <div class="header__actions">
          <form class="search" @submit.prevent="doSearch">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input
              v-model="query"
              type="search"
              placeholder="Search fresh produce…"
              aria-label="Search products"
            />
          </form>

          <NuxtLink
            to="/wishlist"
            class="icon-btn"
            aria-label="Favourites"
            title="Favourites"
          >
            <i class="fa-regular fa-heart"></i>
            <span v-if="wishlistCount" class="icon-btn__badge">{{
              wishlistCount
            }}</span>
          </NuxtLink>

          <button
            class="icon-btn icon-btn--cart"
            aria-label="Open basket"
            @click="openCart"
          >
            <i class="fa-solid fa-basket-shopping"></i>
            <span v-if="cartCount" class="icon-btn__badge">{{
              cartCount
            }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile slide-in nav -->
    <transition name="fade">
      <div
        v-if="mobileNavOpen"
        class="m-overlay"
        @click="setMobileNav(false)"
      ></div>
    </transition>
    <aside class="m-nav" :class="{ 'm-nav--open': mobileNavOpen }">
      <div class="m-nav__head">
        <span class="brand"
          ><span class="brand__mark">🥬</span>
          <span class="brand__text"
            >Capital<span class="brand__accent">Fresh</span></span
          ></span
        >
        <button aria-label="Close menu" @click="setMobileNav(false)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <form class="search search--m" @submit.prevent="doSearch">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          v-model="query"
          type="search"
          placeholder="Search fresh produce…"
        />
      </form>
      <nav class="m-nav__links">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          @click.native="setMobileNav(false)"
          >{{ link.label }}</NuxtLink
        >
        <NuxtLink to="/wishlist" @click.native="setMobileNav(false)"
          >Favourites</NuxtLink
        >
      </nav>
      <div class="m-nav__foot">
        <a href="tel:+61261234567" class="btn btn--ghost btn--block"
          ><i class="fa-solid fa-phone"></i> (02) 6123 4567</a
        >
      </div>
    </aside>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'AppHeader',
  data() {
    return {
      scrolled: false,
      query: '',
      annIndex: 0,
      annTimer: null,
      navLinks: [
        { to: '/shop', label: 'Shop' },
        { to: '/shop?category=boxes', label: 'Fresh Boxes' },
        { to: '/box-builder', label: 'Build a Box' },
        { to: '/recipes', label: 'Recipes' },
        { to: '/about', label: 'About' },
        { to: '/contact', label: 'Contact' },
      ],
      announcements: [
        {
          icon: 'fa-solid fa-truck-fast',
          text: 'Free delivery on orders over $50',
        },
        {
          icon: 'fa-solid fa-clock',
          text: 'Order by 6pm for next-day delivery across Canberra',
        },
        {
          icon: 'fa-solid fa-seedling',
          text: 'Picked fresh each morning · supporting local growers',
        },
      ],
    }
  },
  computed: {
    ...mapGetters(['cartCount']),
    mobileNavOpen() {
      return this.$store.state.ui.mobileNavOpen
    },
    wishlistCount() {
      return this.$store.state.wishlist.length
    },
  },
  mounted() {
    this.onScroll()
    window.addEventListener('scroll', this.onScroll, { passive: true })
    this.annTimer = setInterval(() => {
      this.annIndex = (this.annIndex + 1) % this.announcements.length
    }, 4000)
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.onScroll)
    clearInterval(this.annTimer)
  },
  methods: {
    onScroll() {
      this.scrolled = window.scrollY > 12
    },
    openCart() {
      this.$store.commit('SET_CART_OPEN', true)
    },
    setMobileNav(open) {
      this.$store.commit('SET_MOBILE_NAV', open)
    },
    doSearch() {
      const q = this.query.trim()
      this.setMobileNav(false)
      this.$router.push(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
    },
  },
}
</script>

<style scoped>
.header-wrap {
  position: sticky;
  top: 0;
  z-index: 1000;
}
.announce {
  background: var(--green-900);
  color: #eafff0;
  font-size: 0.8rem;
  text-align: center;
}
.announce__inner {
  padding: 7px 20px;
}
.announce i {
  margin-right: 6px;
  color: var(--amber);
}

.header {
  background: rgba(251, 249, 243, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid transparent;
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}
.header--scrolled {
  border-color: var(--line);
  box-shadow: var(--shadow-sm);
}
.header__inner {
  display: flex;
  align-items: center;
  gap: 18px;
  height: var(--header-h);
}
.header__burger {
  display: none;
  border: 0;
  background: transparent;
  font-size: 1.3rem;
  color: var(--ink);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.4rem;
  white-space: nowrap;
}
.brand__mark {
  font-size: 1.5rem;
}
.brand__accent {
  color: var(--green-600);
}
.nav {
  display: flex;
  gap: 4px;
  margin-left: 6px;
}
.nav__link {
  padding: 8px 13px;
  border-radius: 999px;
  font-weight: 500;
  font-size: 0.93rem;
  color: var(--ink);
  transition: background 0.15s ease, color 0.15s ease;
}
.nav__link:hover {
  background: var(--green-50);
  color: var(--green-700);
}
.nav__link.nuxt-link-exact-active {
  background: var(--green-100);
  color: var(--green-700);
}
.header__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 14px;
  width: 220px;
  transition: width 0.2s ease, box-shadow 0.2s ease;
}
.search:focus-within {
  box-shadow: 0 0 0 3px var(--green-100);
  width: 250px;
}
.search i {
  color: var(--muted);
  font-size: 0.85rem;
}
.search input {
  border: 0;
  outline: 0;
  background: transparent;
  width: 100%;
  font-size: 0.88rem;
  font-family: inherit;
}
.icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 0;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  transition: transform 0.15s ease, background 0.15s ease;
}
.icon-btn:hover {
  transform: translateY(-2px);
  background: var(--green-50);
}
.icon-btn--cart {
  background: var(--green-600);
  color: #fff;
  border-color: var(--green-600);
}
.icon-btn--cart:hover {
  background: var(--green-700);
}
.icon-btn__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--orange);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  border: 2px solid var(--cream);
}

/* Mobile nav */
.m-overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 58, 36, 0.4);
  z-index: 1050;
}
.m-nav {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(320px, 84vw);
  background: var(--cream);
  z-index: 1060;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  padding: 18px;
  box-shadow: var(--shadow-lg);
}
.m-nav--open {
  transform: translateX(0);
}
.m-nav__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.m-nav__head button {
  border: 0;
  background: transparent;
  font-size: 1.4rem;
  color: var(--ink);
}
.search--m {
  width: 100%;
  margin-bottom: 16px;
}
.m-nav__links {
  display: flex;
  flex-direction: column;
}
.m-nav__links a {
  padding: 14px 8px;
  border-bottom: 1px solid var(--line);
  font-weight: 500;
  font-size: 1.05rem;
}
.m-nav__links a:hover {
  color: var(--green-600);
}
.m-nav__foot {
  margin-top: auto;
  padding-top: 16px;
}

@media (max-width: 980px) {
  .nav {
    display: none;
  }
  .search {
    display: none;
  }
  .header__burger {
    display: block;
  }
  .brand {
    margin-right: auto;
  }
  .header__actions {
    margin-left: 0;
  }
}
@media (min-width: 981px) {
  .m-nav,
  .m-overlay {
    display: none;
  }
}
</style>
