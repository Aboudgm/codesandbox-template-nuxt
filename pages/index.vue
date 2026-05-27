<template>
  <div class="home">
    <!-- HERO -->
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__copy">
          <span class="eyebrow"
            ><i class="fa-solid fa-seedling"></i> Canberra's fresh produce
            delivery</span
          >
          <h1 class="hero__title">
            Farm-fresh fruit &amp; veg,<br />
            <span class="hero__hl">delivered to your door.</span>
          </h1>
          <p class="hero__sub">
            Hand-picked at the markets each morning and driven straight to your
            home or office — often within hours of leaving the grower. Eat
            fresher, waste less, support local.
          </p>
          <div class="hero__cta">
            <NuxtLink to="/shop" class="btn btn--accent"
              >Shop the market <i class="fa-solid fa-arrow-right"></i
            ></NuxtLink>
            <NuxtLink to="/box-builder" class="btn btn--light"
              >🧺 Build your own box</NuxtLink
            >
          </div>
          <div class="hero__trust">
            <span
              ><i class="fa-solid fa-star"></i> 4.9/5 from 2,400+ locals</span
            >
            <span
              ><i class="fa-solid fa-truck-fast"></i> Free delivery over
              $50</span
            >
          </div>
        </div>

        <div class="hero__art" aria-hidden="true">
          <div class="hero__plate">🥗</div>
          <span class="float float--1">🍎</span>
          <span class="float float--2">🥕</span>
          <span class="float float--3">🥦</span>
          <span class="float float--4">🍓</span>
          <span class="float float--5">🍋</span>
          <span class="float float--6">🥑</span>
          <div class="hero__badge hero__badge--1">
            <strong>Picked today</strong><span>6:00am @ Fyshwick</span>
          </div>
          <div class="hero__badge hero__badge--2">
            <i class="fa-solid fa-leaf"></i><span>100% local growers</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURE STRIP -->
    <section class="container">
      <div class="features">
        <div v-for="f in features" :key="f.title" class="feature">
          <span class="feature__icon"><i :class="f.icon"></i></span>
          <div>
            <strong>{{ f.title }}</strong>
            <p>{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="section">
      <div class="container">
        <div class="sec-head">
          <div>
            <span class="eyebrow">Shop by category</span>
            <h2 class="section-title">What are you craving?</h2>
          </div>
          <NuxtLink to="/shop" class="sec-head__link"
            >View all <i class="fa-solid fa-arrow-right"></i
          ></NuxtLink>
        </div>
        <div class="grid grid--cats">
          <NuxtLink
            v-for="c in categories"
            :key="c.slug"
            :to="`/shop?category=${c.slug}`"
            class="cat"
            :style="{ background: c.gradient }"
          >
            <span class="cat__emoji">{{ c.emoji }}</span>
            <span class="cat__name">{{ c.name }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- BESTSELLERS -->
    <section class="section section--tight">
      <div class="container">
        <div class="sec-head">
          <div>
            <span class="eyebrow">⭐ Loved by locals</span>
            <h2 class="section-title">This week's bestsellers</h2>
          </div>
          <NuxtLink to="/shop" class="sec-head__link"
            >Shop all <i class="fa-solid fa-arrow-right"></i
          ></NuxtLink>
        </div>
        <div class="grid grid--products">
          <ProductCard v-for="p in bestsellers" :key="p.id" :product="p" />
        </div>
      </div>
    </section>

    <!-- BUILD A BOX PROMO -->
    <section class="section">
      <div class="container">
        <div class="promo">
          <div class="promo__art" aria-hidden="true">
            <span>📦</span>
            <em class="promo__pop promo__pop--1">🍎</em>
            <em class="promo__pop promo__pop--2">🥬</em>
            <em class="promo__pop promo__pop--3">🥚</em>
          </div>
          <div class="promo__copy">
            <span class="eyebrow">Make it yours</span>
            <h2 class="section-title">Build your own fresh box</h2>
            <p>
              Pick exactly what you want, set your budget, and we'll pack it
              fresh. A live budget meter keeps you on track — no surprises at
              checkout.
            </p>
            <ul class="promo__list">
              <li>
                <i class="fa-solid fa-check"></i> Choose any items you like
              </li>
              <li>
                <i class="fa-solid fa-check"></i> Set it to repeat weekly &amp;
                save 10%
              </li>
              <li>
                <i class="fa-solid fa-check"></i> Edit, skip or cancel anytime
              </li>
            </ul>
            <NuxtLink to="/box-builder" class="btn btn--accent"
              >Start building <i class="fa-solid fa-arrow-right"></i
            ></NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ON SALE -->
    <section class="section section--tight">
      <div class="container">
        <div class="sec-head">
          <div>
            <span class="eyebrow">🔥 Limited time</span>
            <h2 class="section-title">Fresh deals this week</h2>
          </div>
        </div>
        <div class="grid grid--products">
          <ProductCard v-for="p in deals" :key="p.id" :product="p" />
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="section how">
      <div class="container">
        <div class="text-center">
          <span class="eyebrow mx-auto">Simple as 1·2·3</span>
          <h2 class="section-title">How Capital Fresh works</h2>
          <p class="section-sub mx-auto">
            From the market to your kitchen in three easy steps.
          </p>
        </div>
        <div class="steps">
          <div v-for="(s, i) in steps" :key="s.title" class="step">
            <span class="step__num">{{ i + 1 }}</span>
            <span class="step__emoji">{{ s.emoji }}</span>
            <h3>{{ s.title }}</h3>
            <p class="muted">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="section">
      <div class="container">
        <div class="text-center">
          <span class="eyebrow mx-auto">Word on the street</span>
          <h2 class="section-title">Canberra is hooked 🥬</h2>
        </div>
        <div class="reviews">
          <figure v-for="t in testimonials" :key="t.name" class="review">
            <div class="stars">★★★★★</div>
            <blockquote>"{{ t.quote }}"</blockquote>
            <figcaption>
              <span class="review__avatar">{{ t.avatar }}</span>
              <span>
                <strong>{{ t.name }}</strong>
                <small>{{ t.suburb }}</small>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- DELIVERY CHECKER -->
    <section class="section section--tight">
      <div class="container">
        <div class="checker">
          <div class="checker__copy">
            <span class="eyebrow">Do we deliver to you?</span>
            <h2 class="section-title">Pop in your postcode</h2>
            <p class="muted">
              We deliver across the ACT and surrounding NSW region, Monday to
              Saturday.
            </p>
          </div>
          <form class="checker__form" @submit.prevent="checkPostcode">
            <input
              v-model="postcode"
              type="text"
              inputmode="numeric"
              maxlength="4"
              placeholder="e.g. 2600"
              aria-label="Postcode"
            />
            <button class="btn" type="submit">Check</button>
            <p
              v-if="postcodeResult"
              class="checker__result"
              :class="{ 'is-bad': !postcodeResult.ok }"
            >
              <i
                :class="
                  postcodeResult.ok
                    ? 'fa-solid fa-circle-check'
                    : 'fa-solid fa-circle-xmark'
                "
              ></i>
              {{ postcodeResult.message }}
            </p>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { products, categories } from '~/data/products'

export default {
  name: 'HomePage',
  data() {
    return {
      categories,
      postcode: '',
      postcodeResult: null,
      features: [
        {
          icon: 'fa-solid fa-truck-fast',
          title: 'Next-day delivery',
          text: 'Order by 6pm across Canberra',
        },
        {
          icon: 'fa-solid fa-seedling',
          title: 'Locally sourced',
          text: 'Backing regional growers',
        },
        {
          icon: 'fa-solid fa-leaf',
          title: 'Zero-waste packing',
          text: 'Reusable crates, no plastic',
        },
        {
          icon: 'fa-solid fa-arrows-rotate',
          title: 'Flexible subscriptions',
          text: 'Skip or cancel anytime',
        },
      ],
      steps: [
        {
          emoji: '🛒',
          title: 'Fill your basket',
          text: 'Browse the market or build a custom box with your favourites.',
        },
        {
          emoji: '🚚',
          title: 'We pick & pack',
          text: 'Our team hand-selects everything fresh on the morning of delivery.',
        },
        {
          emoji: '🍽️',
          title: 'Enjoy fresh',
          text: 'Unpack at your door, cook something great, return the crate.',
        },
      ],
      testimonials: [
        {
          name: 'Mia R.',
          suburb: 'Braddon',
          avatar: '🧑‍🦰',
          quote:
            'The produce is noticeably fresher than the supermarket and lasts twice as long. The weekly box is a lifesaver.',
        },
        {
          name: 'Daniel K.',
          suburb: 'Gungahlin',
          avatar: '🧔',
          quote:
            'Build-a-box is genius. I set my budget, get exactly what I want, and it turns up the next morning. Love it.',
        },
        {
          name: 'Priya S.',
          suburb: 'Kingston',
          avatar: '👩',
          quote:
            'We get the office fruit box every Monday and the team devours it. Easy invoicing, always on time.',
        },
      ],
    }
  },
  computed: {
    bestsellers() {
      return products
        .filter((p) => p.tags.includes('bestseller') || p.reviews > 100)
        .slice(0, 5)
    },
    deals() {
      return products.filter(
        (p) => p.salePrice != null || p.tags.includes('sale')
      )
    },
  },
  methods: {
    checkPostcode() {
      const pc = parseInt(this.postcode, 10)
      if (!pc || this.postcode.length !== 4) {
        this.postcodeResult = {
          ok: false,
          message: 'Please enter a valid 4-digit postcode.',
        }
        return
      }
      const inRange =
        (pc >= 2600 && pc <= 2620) || (pc >= 2900 && pc <= 2914) || pc === 2620
      this.postcodeResult = inRange
        ? {
            ok: true,
            message: `Great news — we deliver to ${pc}! Next-day available.`,
          }
        : {
            ok: false,
            message: `We're not in ${pc} just yet — join the waitlist and we'll let you know.`,
          }
    },
  },
}
</script>

<style scoped>
/* HERO */
.hero {
  background: radial-gradient(
      1200px 500px at 80% -10%,
      var(--green-100),
      transparent
    ),
    var(--green-50);
  overflow: hidden;
}
.hero__inner {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 30px;
  align-items: center;
  padding: 56px 20px 64px;
}
.hero__title {
  font-size: clamp(2.2rem, 5.2vw, 3.9rem);
  margin-bottom: 16px;
}
.hero__hl {
  color: var(--green-600);
}
.hero__sub {
  font-size: 1.08rem;
  color: var(--muted);
  max-width: 50ch;
  margin-bottom: 26px;
}
.hero__cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.hero__trust {
  display: flex;
  gap: 22px;
  margin-top: 24px;
  flex-wrap: wrap;
  font-size: 0.88rem;
  color: var(--muted);
}
.hero__trust i {
  color: var(--amber);
  margin-right: 5px;
}
.hero__trust i.fa-truck-fast {
  color: var(--green-600);
}

.hero__art {
  position: relative;
  height: 420px;
  display: grid;
  place-items: center;
}
.hero__plate {
  font-size: 13rem;
  filter: drop-shadow(0 24px 40px rgba(20, 58, 36, 0.22));
  animation: bob 6s ease-in-out infinite;
}
.float {
  position: absolute;
  font-size: 2.6rem;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.14));
  animation: bob 5s ease-in-out infinite;
}
.float--1 {
  top: 6%;
  left: 12%;
  animation-delay: 0s;
}
.float--2 {
  top: 18%;
  right: 6%;
  animation-delay: 0.6s;
  font-size: 3rem;
}
.float--3 {
  bottom: 16%;
  left: 4%;
  animation-delay: 1.1s;
  font-size: 3.2rem;
}
.float--4 {
  bottom: 6%;
  right: 16%;
  animation-delay: 1.6s;
}
.float--5 {
  top: 44%;
  left: -2%;
  animation-delay: 2.1s;
}
.float--6 {
  top: 38%;
  right: -2%;
  animation-delay: 2.6s;
  font-size: 2.9rem;
}
@keyframes bob {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-16px) rotate(3deg);
  }
}
.hero__badge {
  position: absolute;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  font-size: 0.78rem;
  line-height: 1.3;
  animation: bob 7s ease-in-out infinite;
}
.hero__badge strong {
  font-family: var(--font-body);
}
.hero__badge span {
  color: var(--muted);
}
.hero__badge--1 {
  top: 14%;
  left: -6%;
}
.hero__badge--2 {
  bottom: 12%;
  right: -4%;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  animation-delay: 1.5s;
}
.hero__badge--2 i {
  color: var(--green-600);
  font-size: 1.1rem;
}

/* FEATURES */
.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 22px;
  transform: translateY(-32px);
  margin-bottom: -16px;
}
.feature {
  display: flex;
  gap: 12px;
  align-items: center;
}
.feature__icon {
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--green-50);
  color: var(--green-600);
  display: grid;
  place-items: center;
  font-size: 1.2rem;
}
.feature strong {
  display: block;
  font-size: 0.95rem;
}
.feature p {
  margin: 1px 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}

/* section heading row */
.sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 26px;
  gap: 16px;
}
.sec-head__link {
  color: var(--green-700);
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
}
.sec-head__link:hover {
  text-decoration: underline;
}

/* categories */
.cat {
  position: relative;
  border-radius: var(--radius);
  padding: 22px 18px;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}
.cat:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}
.cat__emoji {
  font-size: 2.6rem;
}
.cat__name {
  font-weight: 700;
  font-family: var(--font-display);
  font-size: 1.15rem;
  color: var(--green-900);
}

/* promo */
.promo {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 30px;
  align-items: center;
  background: linear-gradient(135deg, #fff, var(--green-50));
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 40px;
  overflow: hidden;
}
.promo__art {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 220px;
}
.promo__art > span {
  font-size: 9rem;
  filter: drop-shadow(0 18px 28px rgba(20, 58, 36, 0.18));
}
.promo__pop {
  position: absolute;
  font-size: 2.6rem;
  animation: bob 5s ease-in-out infinite;
}
.promo__pop--1 {
  top: 10%;
  left: 20%;
}
.promo__pop--2 {
  top: 24%;
  right: 14%;
  animation-delay: 0.8s;
}
.promo__pop--3 {
  bottom: 14%;
  left: 30%;
  animation-delay: 1.4s;
}
.promo__list {
  list-style: none;
  padding: 0;
  margin: 16px 0 24px;
}
.promo__list li {
  padding: 5px 0;
  color: var(--ink);
}
.promo__list i {
  color: var(--green-600);
  margin-right: 10px;
}

/* how it works */
.how {
  background: var(--green-50);
}
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 36px;
}
.step {
  position: relative;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 30px 24px;
  text-align: center;
}
.step__num {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--green-600);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}
.step__emoji {
  font-size: 3rem;
  display: block;
  margin: 10px 0 12px;
}

/* reviews */
.reviews {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 30px;
}
.review {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 26px;
  margin: 0;
  box-shadow: var(--shadow-sm);
}
.review blockquote {
  margin: 12px 0 18px;
  font-size: 1rem;
  line-height: 1.6;
}
.review figcaption {
  display: flex;
  align-items: center;
  gap: 12px;
}
.review__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--green-100);
  display: grid;
  place-items: center;
  font-size: 1.4rem;
}
.review figcaption small {
  display: block;
  color: var(--muted);
}

/* postcode checker */
.checker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: center;
  background: linear-gradient(135deg, var(--green-700), var(--green-600));
  border-radius: var(--radius-lg);
  padding: 40px;
  color: #fff;
}
.checker .eyebrow {
  color: #cdeed9;
}
.checker__copy h2 {
  color: #fff;
}
.checker__copy .muted {
  color: #dcf3e5;
}
.checker__form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.checker__form input {
  flex: 1;
  min-width: 160px;
  border: 0;
  border-radius: 999px;
  padding: 14px 20px;
  font-size: 1rem;
  font-family: inherit;
  outline: 0;
}
.checker__result {
  width: 100%;
  margin: 4px 0 0;
  background: rgba(255, 255, 255, 0.16);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}
.checker__result i {
  margin-right: 6px;
}
.checker__result.is-bad {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 920px) {
  .hero__inner {
    grid-template-columns: 1fr;
  }
  .hero__art {
    height: 320px;
    order: -1;
  }
  .features {
    grid-template-columns: repeat(2, 1fr);
  }
  .promo,
  .checker {
    grid-template-columns: 1fr;
    padding: 28px;
  }
  .promo__art {
    min-height: 160px;
  }
  .steps,
  .reviews {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .features {
    grid-template-columns: 1fr;
  }
  .hero__badge {
    display: none;
  }
}
</style>
