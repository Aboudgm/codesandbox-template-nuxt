<template>
  <div class="recipes">
    <div class="recipes__hero">
      <div class="container">
        <span class="eyebrow"
          ><i class="fa-solid fa-utensils"></i> Cook something fresh</span
        >
        <h1>Recipes &amp; inspiration</h1>
        <p class="muted">
          Simple, seasonal recipes built around what's fresh right now. Tap a
          recipe to add every ingredient to your basket in one click.
        </p>
      </div>
    </div>

    <div class="container recipes__grid">
      <article v-for="r in recipes" :key="r.id" class="recipe" @click="open(r)">
        <div class="recipe__media" :style="{ background: r.gradient }">
          <span>{{ r.emoji }}</span>
        </div>
        <div class="recipe__body">
          <div class="recipe__meta">
            <span><i class="fa-solid fa-clock"></i> {{ r.time }}</span>
            <span><i class="fa-solid fa-utensils"></i> {{ r.serves }}</span>
            <span class="recipe__diff">{{ r.difficulty }}</span>
          </div>
          <h3>{{ r.title }}</h3>
          <p class="muted">{{ r.blurb }}</p>
          <span class="recipe__link"
            >View recipe <i class="fa-solid fa-arrow-right"></i
          ></span>
        </div>
      </article>
    </div>

    <!-- Modal -->
    <transition name="fade">
      <div v-if="active" class="modal" @click.self="close">
        <div class="modal__panel">
          <button class="modal__close" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <div class="modal__head" :style="{ background: active.gradient }">
            <span class="modal__emoji">{{ active.emoji }}</span>
          </div>
          <div class="modal__body">
            <h2>{{ active.title }}</h2>
            <div class="recipe__meta">
              <span><i class="fa-solid fa-clock"></i> {{ active.time }}</span>
              <span
                ><i class="fa-solid fa-utensils"></i> {{ active.serves }}</span
              >
              <span class="recipe__diff">{{ active.difficulty }}</span>
            </div>
            <p>{{ active.blurb }}</p>

            <h4>Ingredients</h4>
            <ul class="modal__ings">
              <li v-for="ing in activeIngredients" :key="ing.id">
                <span>{{ ing.emoji }} {{ ing.name }}</span>
                <NuxtLink :to="`/products/${ing.slug}`" class="modal__ing-link"
                  >${{ ing.price.toFixed(2) }}</NuxtLink
                >
              </li>
            </ul>

            <h4>Method</h4>
            <ol class="modal__steps">
              <li v-for="(s, i) in active.steps" :key="i">{{ s }}</li>
            </ol>

            <button class="btn btn--block btn--accent" @click="addAll">
              <i class="fa-solid fa-basket-shopping"></i>
              Add {{ activeIngredients.length }} ingredients · ${{
                ingredientsTotal.toFixed(2)
              }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { productBySlug, effectivePrice } from '~/data/products'

export default {
  name: 'RecipesPage',
  data() {
    return {
      active: null,
      recipes: [
        {
          id: 1,
          title: 'Smashed Avo & Egg Toast',
          emoji: '🥑',
          gradient: 'linear-gradient(135deg,#d6f5c2,#8fd16b)',
          time: '10 min',
          serves: 'Serves 2',
          difficulty: 'Easy',
          blurb:
            'The Canberra brunch classic — creamy avo, jammy eggs and crusty sourdough.',
          ings: [
            'hass-avocados',
            'free-range-eggs',
            'sourdough-loaf',
            'lemons',
          ],
          steps: [
            'Toast thick slices of sourdough until golden.',
            'Smash the avocado with a squeeze of lemon, salt and pepper.',
            'Soft-boil or fry the eggs to your liking.',
            'Pile avo on toast, top with eggs and a final crack of pepper.',
          ],
        },
        {
          id: 2,
          title: 'Rainbow Roast Veg Tray',
          emoji: '🥕',
          gradient: 'linear-gradient(135deg,#ffd9a5,#fd9a7d)',
          time: '40 min',
          serves: 'Serves 4',
          difficulty: 'Easy',
          blurb:
            'A simple, colourful tray bake that lets the veg do the talking.',
          ings: [
            'dutch-carrots',
            'sebago-potatoes',
            'capsicum-red',
            'brown-onions',
            'extra-virgin-olive-oil',
          ],
          steps: [
            'Heat oven to 200°C. Chop all veg into even chunks.',
            'Toss with olive oil, salt, pepper and any herbs you like.',
            'Spread on a tray and roast 35–40 min, turning once.',
            'Finish with a drizzle of oil and fresh herbs.',
          ],
        },
        {
          id: 3,
          title: 'Strawberry Breakfast Bowl',
          emoji: '🍓',
          gradient: 'linear-gradient(135deg,#ffc1cc,#ff7a93)',
          time: '5 min',
          serves: 'Serves 1',
          difficulty: 'Easy',
          blurb:
            'Thick Greek yoghurt, ripe strawberries and a drizzle of raw honey.',
          ings: [
            'greek-yoghurt',
            'strawberries-punnet',
            'raw-honey',
            'cavendish-bananas',
          ],
          steps: [
            'Spoon Greek yoghurt into a bowl.',
            'Slice strawberries and banana over the top.',
            'Drizzle generously with raw honey.',
            'Add granola or nuts if you like a crunch.',
          ],
        },
        {
          id: 4,
          title: 'Garden Pasta Primavera',
          emoji: '🍝',
          gradient: 'linear-gradient(135deg,#c2f0c2,#5ab85a)',
          time: '25 min',
          serves: 'Serves 4',
          difficulty: 'Medium',
          blurb:
            'Fresh egg fettuccine tangled with spring veg, basil and parmesan.',
          ings: [
            'pasta-fresh',
            'truss-tomatoes',
            'broccoli',
            'basil-bunch',
            'extra-virgin-olive-oil',
          ],
          steps: [
            'Cook the fresh fettuccine for 3 minutes, reserving a cup of water.',
            'Sauté broccoli and halved tomatoes in olive oil until just tender.',
            'Toss pasta through the veg with a splash of pasta water.',
            'Finish with torn basil and plenty of parmesan.',
          ],
        },
        {
          id: 5,
          title: 'Crunchy Cos Caesar',
          emoji: '🥗',
          gradient: 'linear-gradient(135deg,#a8e6a1,#3aa655)',
          time: '15 min',
          serves: 'Serves 2',
          difficulty: 'Easy',
          blurb: 'Crisp cos, soft egg and golden sourdough croutons.',
          ings: [
            'cos-lettuce',
            'free-range-eggs',
            'sourdough-loaf',
            'cheddar-wedge',
          ],
          steps: [
            'Tear sourdough into chunks and bake until crisp for croutons.',
            'Boil eggs for 7 minutes, then halve.',
            'Toss cos leaves with dressing of your choice.',
            'Top with eggs, croutons and shaved cheddar.',
          ],
        },
        {
          id: 6,
          title: 'Green Power Smoothie',
          emoji: '🥤',
          gradient: 'linear-gradient(135deg,#b8e6d2,#2f9e6f)',
          time: '5 min',
          serves: 'Serves 2',
          difficulty: 'Easy',
          blurb: 'Banana, spinach and yoghurt blitzed into a creamy green hit.',
          ings: [
            'cavendish-bananas',
            'baby-spinach',
            'greek-yoghurt',
            'whole-milk-2l',
          ],
          steps: [
            'Add banana, a big handful of spinach and yoghurt to the blender.',
            'Pour in milk to your preferred thickness.',
            'Blitz until smooth and bright green.',
            'Pour, sip, glow.',
          ],
        },
      ],
    }
  },
  head: { title: 'Recipes — Capital Fresh' },
  computed: {
    activeIngredients() {
      if (!this.active) return []
      return this.active.ings
        .map((slug) => {
          const p = productBySlug(slug)
          return p ? { ...p, price: effectivePrice(p) } : null
        })
        .filter(Boolean)
    },
    ingredientsTotal() {
      return +this.activeIngredients
        .reduce((sum, p) => sum + p.price, 0)
        .toFixed(2)
    },
  },
  watch: {
    active(v) {
      if (process.client) document.body.style.overflow = v ? 'hidden' : ''
    },
  },
  methods: {
    open(r) {
      this.active = r
    },
    close() {
      this.active = null
    },
    addAll() {
      this.activeIngredients.forEach((p) =>
        this.$store.commit('ADD_TO_CART', { id: p.id, qty: 1 })
      )
      this.$store.dispatch('notify', {
        type: 'success',
        message: `🧑‍🍳 ${this.activeIngredients.length} ingredients added for "${this.active.title}"`,
      })
      this.close()
      this.$store.commit('SET_CART_OPEN', true)
    },
  },
}
</script>

<style scoped>
.recipes__hero {
  background: var(--green-50);
  padding: 40px 0 28px;
  border-bottom: 1px solid var(--line);
}
.recipes__hero h1 {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  margin-bottom: 4px;
}
.recipes__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  padding-top: 30px;
  padding-bottom: 60px;
}
.recipe {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}
.recipe:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}
.recipe__media {
  aspect-ratio: 16 / 10;
  display: grid;
  place-items: center;
}
.recipe__media span {
  font-size: 4.5rem;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.14));
}
.recipe__body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.recipe__meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: var(--muted);
  margin-bottom: 8px;
}
.recipe__meta i {
  color: var(--green-600);
  margin-right: 3px;
}
.recipe__diff {
  background: var(--green-100);
  color: var(--green-700);
  padding: 1px 9px;
  border-radius: 999px;
  font-weight: 600;
}
.recipe__body h3 {
  margin: 0 0 6px;
  font-size: 1.15rem;
}
.recipe__link {
  margin-top: auto;
  padding-top: 12px;
  color: var(--green-700);
  font-weight: 600;
  font-size: 0.88rem;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(20, 58, 36, 0.5);
  z-index: 1150;
  display: grid;
  place-items: center;
  padding: 20px;
}
.modal__panel {
  position: relative;
  background: var(--cream);
  border-radius: var(--radius-lg);
  width: min(560px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}
.modal__close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.92);
  font-size: 1.1rem;
}
.modal__head {
  height: 150px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.modal__emoji {
  font-size: 5rem;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.14));
}
.modal__body {
  padding: 24px 26px 28px;
}
.modal__body h2 {
  margin-bottom: 8px;
}
.modal__body h4 {
  margin: 20px 0 10px;
  font-family: var(--font-body);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.82rem;
  color: var(--muted);
}
.modal__ings {
  list-style: none;
  padding: 0;
  margin: 0;
}
.modal__ings li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
  font-size: 0.95rem;
}
.modal__ing-link {
  font-weight: 700;
  color: var(--green-700);
}
.modal__ing-link:hover {
  text-decoration: underline;
}
.modal__steps {
  padding-left: 20px;
  margin: 0 0 22px;
}
.modal__steps li {
  padding: 5px 0;
  line-height: 1.5;
}

@media (max-width: 860px) {
  .recipes__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 540px) {
  .recipes__grid {
    grid-template-columns: 1fr;
  }
}
</style>
