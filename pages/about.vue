<template>
  <div class="about">
    <section class="about__hero">
      <div class="container about__hero-inner">
        <div>
          <span class="eyebrow"
            ><i class="fa-solid fa-seedling"></i> Our story</span
          >
          <h1>Fresh food, fair prices, fewer food miles.</h1>
          <p>
            Capital Fresh started at a single market stall in Fyshwick with one
            simple belief: Canberrans deserve produce that tastes the way it
            should. Today we deliver that same market-fresh quality straight to
            thousands of homes and offices across the region.
          </p>
          <div class="about__cta">
            <NuxtLink to="/shop" class="btn btn--accent"
              >Shop the market</NuxtLink
            >
            <NuxtLink to="/contact" class="btn btn--light"
              >Get in touch</NuxtLink
            >
          </div>
        </div>
        <div class="about__hero-art" aria-hidden="true">
          <span>🚜</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="stats">
          <div v-for="s in stats" :key="s.label" class="stat">
            <strong>{{ s.value }}</strong>
            <span class="muted">{{ s.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section about__values">
      <div class="container">
        <div class="text-center">
          <span class="eyebrow mx-auto">What we stand for</span>
          <h2 class="section-title">Good food, done right</h2>
        </div>
        <div class="values">
          <div v-for="v in values" :key="v.title" class="value card">
            <span class="value__emoji">{{ v.emoji }}</span>
            <h3>{{ v.title }}</h3>
            <p class="muted">{{ v.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="text-center">
          <span class="eyebrow mx-auto">Our growers</span>
          <h2 class="section-title">Meet the people behind your produce</h2>
          <p class="section-sub mx-auto">
            We partner with family farms across the ACT and surrounding NSW.
          </p>
        </div>
        <div class="growers">
          <div v-for="g in growers" :key="g.name" class="grower">
            <span class="grower__emoji">{{ g.emoji }}</span>
            <strong>{{ g.name }}</strong>
            <small class="muted">{{ g.region }}</small>
            <p>{{ g.note }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="join card">
          <div>
            <h2 class="section-title">Hungry yet?</h2>
            <p class="muted">
              Join thousands of locals eating fresher every week.
            </p>
          </div>
          <NuxtLink to="/box-builder" class="btn btn--accent"
            >Build your first box <i class="fa-solid fa-arrow-right"></i
          ></NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'AboutPage',
  data() {
    return {
      stats: [
        { value: '12+', label: 'Local farm partners' },
        { value: '2,400+', label: 'Happy households' },
        { value: '6am', label: 'Daily market pick' },
        { value: '100%', label: 'Plastic-free packing' },
      ],
      values: [
        {
          emoji: '🌱',
          title: 'Locally sourced',
          text: 'We buy direct from regional growers, so your food travels less and tastes more.',
        },
        {
          emoji: '♻️',
          title: 'Low waste',
          text: 'Reusable crates, compostable liners and smart ordering keep waste to a minimum.',
        },
        {
          emoji: '🤝',
          title: 'Fair for farmers',
          text: 'Transparent pricing that pays growers properly for the quality they produce.',
        },
        {
          emoji: '⚡',
          title: 'Genuinely fresh',
          text: 'Picked and packed the morning of delivery — never sitting in a warehouse.',
        },
      ],
      growers: [
        {
          emoji: '🍎',
          name: 'Highland Orchards',
          region: 'Batlow, NSW',
          note: 'Three generations of apple growers in the cool Snowy foothills.',
        },
        {
          emoji: '🥚',
          name: 'Murrumbateman Eggs',
          region: 'Murrumbateman, NSW',
          note: 'Genuinely free-range hens roaming open pasture year round.',
        },
        {
          emoji: '🍯',
          name: 'Yass Valley Honey',
          region: 'Yass, NSW',
          note: 'Raw, unfiltered wildflower honey from chemical-free hives.',
        },
        {
          emoji: '🥬',
          name: 'Pialligo Market Garden',
          region: 'Pialligo, ACT',
          note: 'Leafy greens and herbs grown minutes from the city.',
        },
      ],
    }
  },
  head: { title: 'About — Capital Fresh' },
}
</script>

<style scoped>
.about__hero {
  background: radial-gradient(
      900px 400px at 90% 0%,
      var(--green-100),
      transparent
    ),
    var(--green-50);
}
.about__hero-inner {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 30px;
  align-items: center;
  padding: 56px 20px;
}
.about__hero h1 {
  font-size: clamp(2rem, 4.6vw, 3.2rem);
  margin-bottom: 14px;
}
.about__hero p {
  font-size: 1.05rem;
  color: var(--muted);
  max-width: 54ch;
  margin-bottom: 22px;
}
.about__cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.about__hero-art {
  text-align: center;
}
.about__hero-art span {
  font-size: 9rem;
  filter: drop-shadow(0 18px 30px rgba(20, 58, 36, 0.2));
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
.stat {
  text-align: center;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 26px 14px;
  box-shadow: var(--shadow-sm);
}
.stat strong {
  display: block;
  font-family: var(--font-display);
  font-size: 2.2rem;
  color: var(--green-700);
}

.about__values {
  background: var(--green-50);
}
.values {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 32px;
}
.value {
  padding: 26px;
  text-align: center;
}
.value__emoji {
  font-size: 2.6rem;
}
.value h3 {
  margin: 12px 0 6px;
  font-size: 1.15rem;
}

.growers {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 32px;
}
.grower {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.grower__emoji {
  font-size: 2.6rem;
  display: block;
  margin-bottom: 8px;
}
.grower strong {
  display: block;
}
.grower p {
  margin: 10px 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}

.join {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 36px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #fff, var(--green-50));
}

@media (max-width: 860px) {
  .about__hero-inner {
    grid-template-columns: 1fr;
  }
  .about__hero-art {
    order: -1;
  }
  .stats,
  .values,
  .growers {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .stats,
  .values,
  .growers {
    grid-template-columns: 1fr;
  }
}
</style>
