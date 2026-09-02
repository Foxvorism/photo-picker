<script setup lang="ts">
const colorMode = useColorMode();

const isDarkMode = computed(() => colorMode.value === "dark");

function toggleColorMode() {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
}
</script>

<template>
  <ClientOnly>
    <UButton
      :aria-label="isDarkMode ? 'Aktifkan light mode' : 'Aktifkan dark mode'"
      class="fixed bottom-3 right-3 md:bottom-5 md:right-5 z-40 rounded-full bg-[#083182]! text-white! shadow-xl shadow-[#083182]/25 transition hover:bg-[#062764]! active:bg-[#062764]! focus-visible:ring-[#083182]/40! dark:bg-[#d0dbee]! dark:text-[#083182]! dark:hover:bg-[#eaf0fb]! dark:active:bg-[#eaf0fb]! dark:focus-visible:ring-[#d0dbee]/50!"
      color="neutral"
      size="xl"
      square
      variant="solid"
      @click="toggleColorMode"
    >
      <UIcon
        v-if="isDarkMode"
        key="sun"
        name="i-lucide-sun"
        class="size-5 text-current"
      />
      <UIcon
        v-else
        key="moon"
        name="i-lucide-moon"
        class="size-5 text-current"
      />
    </UButton>
  </ClientOnly>
</template>
