// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/a11y',
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/hints',
    '@nuxt/scripts',
    '@nuxt/ui',
    '@ant-design-vue/nuxt',
    '@clerk/nuxt',
    '@formkit/auto-animate',
    'nuxt-seo-utils',
    'nuxt-toast',
    'usebootstrap',
    'nuxt-security',
    'nuxt-qrcode',
    'nuxt-processor',
    'nuxt-payload-analyzer',
    'nuxt-icons',
    'nuxt-jsonapi',
    'nuxt-jsonld',
    'nuxt-email-renderer',
    'nuxt-auth-utils',
    'nuxt-authorization'
  ]
})