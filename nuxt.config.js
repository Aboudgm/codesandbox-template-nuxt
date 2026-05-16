export default {
  target: 'server',

  head: {
    title: 'LicheeRV Nano Dashboard',
    htmlAttrs: { lang: 'en' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Interactive dashboard for Sipeed LicheeRV Nano' },
      { name: 'format-detection', content: 'telephone=no' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
      },
    ],
  },

  css: ['xterm/css/xterm.css'],

  plugins: [],

  components: true,

  buildModules: ['@nuxt/typescript-build'],

  modules: ['@nuxtjs/axios'],

  axios: { baseURL: '/' },

  serverMiddleware: [{ path: '/api', handler: '~/server-middleware/api.js' }],

  hooks: {
    listen(server) {
      const socketServer = require('./server/socket-server')
      socketServer.attach(server)
    },
  },

  build: {
    transpile: ['xterm'],
  },

  telemetry: false,
}
