const resolvedApiBaseUrl =
  import.meta.env.NUXT_PUBLIC_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.dev ? 'http://localhost:8080/api/v1' : '/api/v1')

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
