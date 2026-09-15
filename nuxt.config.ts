export default defineNuxtConfig({
  compatibilityDate: "2026-08-21",

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon-sut.ico?v=2" }],
    },
  },

  modules: ["@nuxt/ui"],

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    adminSecretKey: "",
    sutooriSecretKey: "",
    sinemayuSecretKey: "",
    supabaseUrl: "",
    supabaseSecretKey: "",
    sessionSecret: "",
    supabaseBucket: "",
    fonnteToken: "",
    fonnteCountryCode: "62",
  },
});
