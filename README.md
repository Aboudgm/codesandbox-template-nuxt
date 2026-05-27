# Capital Fresh 🥬

A full-featured, responsive e-commerce storefront for a fresh-produce delivery
business (a re-imagined, feature-rich take on capitalfresh.com.au), built with
[Nuxt 2](https://v2.nuxt.com/) + Vuex. Shopify-style shopping experience with no
backend required — all state is client-side and persisted to `localStorage`.

## Features

- **Product catalogue** — 38 products across 6 categories with ratings, tags,
  sale pricing and origin details.
- **Shop** — live search, category + tag filters, price slider and sorting.
- **Product pages** — quantity selector, tabs (details / storage / reviews),
  wishlist and related products.
- **Slide-out cart drawer** with a live free-delivery progress bar.
- **Cart + multi-step checkout** — delivery details, payment methods, review &
  order confirmation with validation.
- **Build-a-Box** — interactive box builder with a live budget meter.
- **Recipes** — add every ingredient of a recipe to your basket in one click.
- **Subscriptions** — one-off / weekly / fortnightly with a 10% recurring
  discount.
- **Wishlist**, toast notifications, postcode delivery checker and a fully
  responsive layout with a mobile nav.

## Develop

```bash
yarn install
NODE_OPTIONS=--openssl-legacy-provider yarn dev      # dev server
NODE_OPTIONS=--openssl-legacy-provider yarn generate # static build → dist/
yarn test                                            # unit tests
yarn lint                                            # eslint + prettier
```

> The `NODE_OPTIONS=--openssl-legacy-provider` flag is required to run Nuxt 2
> (webpack 4) on Node 17+.

## Tech notes

- State lives in `store/index.js` (cart, wishlist, delivery frequency, toasts)
  and is persisted via `plugins/persist.client.js`.
- Product data is in `data/products.js`. Cards use emoji + gradients so the
  store renders perfectly offline — add an `image` field to drop in real
  photography.
