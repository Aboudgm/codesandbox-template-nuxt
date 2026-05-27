export default {
  target: 'static',

  head: {
    title: 'Capital Fresh — Farm-fresh fruit & veg delivered',
    htmlAttrs: {
      lang: 'en',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#1f6b3b' },
      {
        hid: 'description',
        name: 'description',
        content:
          'Capital Fresh delivers market-fresh fruit, vegetables and local groceries to your door across the Canberra region. Order online for next-day delivery.',
      },
      { name: 'format-detection', content: 'telephone=no' },
      { hid: 'og:title', property: 'og:title', content: 'Capital Fresh' },
      {
        hid: 'og:description',
        property: 'og:description',
        content: 'Farm-fresh fruit & veg, delivered to your door.',
      },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: true,
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
      },
    ],
  },

  css: ['~/assets/css/main.css'],

  plugins: ['~/plugins/persist.client.js'],

  components: true,

  buildModules: ['@nuxt/typescript-build'],

  modules: ['@nuxtjs/axios'],

  axios: {
    baseURL: '/',
  },

  build: {},

  telemetry: false,
}
