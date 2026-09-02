export default defineNuxtConfig({
  compatibilityDate: "2026-08-21",

  devtools: {
    enabled: true,
  },

  modules: ["@nuxt/ui", "@vercel/analytics"],

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    supabaseUrl: "",
    supabaseSecretKey: "",
    sessionSecret: "",
    supabaseBucket: "photo-previews",
    fonnteToken: "",
    fonnteCountryCode: "62",
  },
});
