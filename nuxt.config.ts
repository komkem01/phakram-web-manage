const resolvedApiBaseUrl =
  process.env.NUXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'http://localhost:8080/api/v1'

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
