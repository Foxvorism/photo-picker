<script setup lang="ts">
import sutooriLogoDark from "~/assets/images/sutoori-logo-dark.webp";
import sutooriLogoLight from "~/assets/images/sutoori-logo-light.webp";

type Props = {
  clientName?: string;
  photoCount: number;
  projectTitle?: string;
  selectedCount: number;
  selectionLimit: number;
};

defineProps<Props>();
</script>

<template>
  <header class="sticky top-3 z-30">
    <div
      class="mx-auto grid min-h-11 w-full grid-cols-3 items-center gap-2 rounded-full border border-white/20 bg-[#083182]/95 dark:bg-[#d0dbee] dark:text-[#083182] px-3 py-2 text-white shadow-2xl shadow-[#083182]/20 backdrop-blur sm:min-h-13 sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-3 md:px-6"
    >
      <NuxtLink
        aria-label="SUTOORI"
        class="flex h-7 items-center md:h-11"
        to="/"
      >
        <img
          alt="SUTOORI"
          class="block h-full w-full object-contain object-left dark:hidden"
          :src="sutooriLogoLight"
        />
        <img
          alt="SUTOORI"
          class="hidden h-full w-full object-contain object-left dark:block"
          :src="sutooriLogoDark"
        />
      </NuxtLink>

      <div class="min-w-0 text-center block">
        <h1 class="text-xs font-semibold md:text-base">
          {{ projectTitle ?? "Galeri Foto" }}
        </h1>

        <p
          class="hidden mt-0.5 truncate text-xs font-medium text-white/70 dark:text-[#083182]/70 md:block sm:text-sm"
        >
          {{ clientName ?? "Client" }}
        </p>
      </div>

      <div class="justify-self-end text-right">
        <p class="text-xs font-semibold leading-none md:text-base">
          {{ selectedCount }} / {{ selectionLimit }} selected
        </p>

        <p
          class="mt-0.5 text-[10px] font-medium leading-none text-white/70 dark:text-[#083182]/70 md:mt-1 md:text-xs"
        >
          {{ photoCount }} photos
        </p>
      </div>
    </div>
  </header>
</template>
