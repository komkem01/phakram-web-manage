const resolvedApiBaseUrl =
  import.meta.env.NUXT_PUBLIC_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api/v1'

const resolvedDevApiTarget =
  import.meta.env.NUXT_DEV_API_TARGET ||
  import.meta.env.DEV_API_TARGET ||
  'http://127.0.0.1:8080'

export default defineNuxtConfig({
  compatibilityDate: '2026-02-16',

  runtimeConfig: {
    public: {
      apiBaseUrl: resolvedApiBaseUrl
    }
  },

  modules: [
    '@nuxt/ui'
  ],

  nitro: {
    devProxy: {
      '/api/v1': {
        target: resolvedDevApiTarget,
        changeOrigin: true,
        prependPath: true
      }
    }
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'phakram manage',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  $production: {
    routeRules: {
      '/**': { isr: true },
    },
  },
  $development: {
    //
  },
  $env: {
    dev: {
      //
    },
  },
})
