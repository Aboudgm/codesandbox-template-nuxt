<template>
  <footer class="footer">
    <div class="footer__cta">
      <div class="container footer__cta-inner">
        <div>
          <h2>Fresh, every week — on autopilot 🥕</h2>
          <p>
            Join the weekly veg box club and save 10% on every recurring
            delivery. Skip, pause or cancel anytime.
          </p>
        </div>
        <form class="newsletter" @submit.prevent="subscribe">
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@email.com"
            aria-label="Email address"
          />
          <button class="btn btn--accent" type="submit">Subscribe</button>
        </form>
      </div>
    </div>

    <div class="container footer__grid">
      <div class="footer__brand">
        <span class="brand"
          ><span class="brand__mark">🥬</span> Capital<span
            class="brand__accent"
            >Fresh</span
          ></span
        >
        <p class="muted">
          Market-fresh fruit, vegetables and local groceries delivered to homes
          and offices across the Canberra region.
        </p>
        <div class="socials">
          <a href="#" aria-label="Instagram"
            ><i class="fa-brands fa-instagram"></i
          ></a>
          <a href="#" aria-label="Facebook"
            ><i class="fa-brands fa-facebook-f"></i
          ></a>
          <a href="#" aria-label="TikTok"
            ><i class="fa-brands fa-tiktok"></i
          ></a>
          <a href="#" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
        </div>
      </div>

      <div class="footer__col">
        <h4>Shop</h4>
        <NuxtLink to="/shop">All produce</NuxtLink>
        <NuxtLink to="/shop?category=fruit">Fruit</NuxtLink>
        <NuxtLink to="/shop?category=vegetables">Vegetables</NuxtLink>
        <NuxtLink to="/shop?category=boxes">Fresh boxes</NuxtLink>
        <NuxtLink to="/box-builder">Build a box</NuxtLink>
      </div>

      <div class="footer__col">
        <h4>Company</h4>
        <NuxtLink to="/about">About us</NuxtLink>
        <NuxtLink to="/recipes">Recipes</NuxtLink>
        <NuxtLink to="/contact">Contact</NuxtLink>
        <a href="#">Wholesale &amp; offices</a>
        <a href="#">Careers</a>
      </div>

      <div class="footer__col">
        <h4>Get in touch</h4>
        <a href="tel:+61261234567"
          ><i class="fa-solid fa-phone"></i> (02) 6123 4567</a
        >
        <a href="mailto:hello@capitalfresh.com.au"
          ><i class="fa-solid fa-envelope"></i> hello@capitalfresh.com.au</a
        >
        <span class="muted"
          ><i class="fa-solid fa-location-dot"></i> Fyshwick Markets, Canberra
          ACT</span
        >
        <span class="muted"
          ><i class="fa-solid fa-clock"></i> Mon–Sat, 6am–4pm</span
        >
      </div>
    </div>

    <div class="footer__bar">
      <div class="container footer__bar-inner">
        <span>© {{ year }} Capital Fresh. Made with 🌱 in Canberra.</span>
        <div class="footer__pay">
          <i class="fa-brands fa-cc-visa"></i>
          <i class="fa-brands fa-cc-mastercard"></i>
          <i class="fa-brands fa-cc-amex"></i>
          <i class="fa-brands fa-cc-paypal"></i>
          <i class="fa-brands fa-cc-apple-pay"></i>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'AppFooter',
  data() {
    return { email: '' }
  },
  computed: {
    year() {
      return new Date().getFullYear()
    },
  },
  methods: {
    subscribe() {
      this.$store.dispatch('notify', {
        type: 'success',
        message: `🎉 You're in! Welcome discount sent to ${this.email}`,
      })
      this.email = ''
    },
  },
}
</script>

<style scoped>
.footer {
  background: var(--green-900);
  color: #cfe3d6;
  margin-top: 40px;
}
.footer__cta {
  background: linear-gradient(135deg, var(--green-700), var(--green-600));
  margin: 0 16px;
  border-radius: var(--radius-lg);
  transform: translateY(-40px);
  box-shadow: var(--shadow);
}
.footer__cta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 34px 36px;
  flex-wrap: wrap;
}
.footer__cta h2 {
  color: #fff;
  font-size: clamp(1.4rem, 3vw, 2rem);
  margin-bottom: 6px;
}
.footer__cta p {
  color: #e3f5e9;
  margin: 0;
  max-width: 46ch;
}
.newsletter {
  display: flex;
  gap: 8px;
  background: #fff;
  padding: 6px;
  border-radius: 999px;
  flex: 1;
  min-width: 280px;
  max-width: 420px;
}
.newsletter input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 0 16px;
  font-family: inherit;
  font-size: 0.95rem;
}
.footer__grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1.3fr;
  gap: 30px;
  padding-bottom: 30px;
  margin-top: -10px;
}
.footer__brand .brand {
  color: #fff;
  font-size: 1.4rem;
}
.footer__brand .brand__accent {
  color: var(--green-500);
}
.footer__brand p {
  margin: 12px 0 16px;
  color: #a9c6b4;
  max-width: 40ch;
}
.socials {
  display: flex;
  gap: 10px;
}
.socials a {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: grid;
  place-items: center;
  color: #fff;
  transition: background 0.2s ease, transform 0.15s ease;
}
.socials a:hover {
  background: var(--green-600);
  transform: translateY(-2px);
}
.footer__col h4 {
  color: #fff;
  font-size: 1rem;
  margin-bottom: 14px;
}
.footer__col a,
.footer__col span {
  display: block;
  color: #a9c6b4;
  padding: 5px 0;
  font-size: 0.9rem;
}
.footer__col a:hover {
  color: #fff;
}
.footer__col i {
  width: 18px;
  color: var(--green-500);
}
.footer__bar {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.footer__bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  font-size: 0.82rem;
  color: #a9c6b4;
  flex-wrap: wrap;
  gap: 10px;
}
.footer__pay {
  display: flex;
  gap: 10px;
  font-size: 1.5rem;
  color: #cfe3d6;
}
@media (max-width: 860px) {
  .footer__grid {
    grid-template-columns: 1fr 1fr;
  }
  .footer__cta-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
@media (max-width: 520px) {
  .footer__grid {
    grid-template-columns: 1fr;
  }
}
</style>
