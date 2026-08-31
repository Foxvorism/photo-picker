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
      class="mx-auto grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-2 rounded-full border border-white/20 bg-[#083182]/95 dark:bg-[#d0dbee] dark:text-[#083182] px-3 py-2 text-white shadow-2xl shadow-[#083182]/20 backdrop-blur sm:min-h-13 sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[1fr_minmax(18rem,2fr)_1fr] md:px-6"
    >
      <NuxtLink
        aria-label="SUTOORI"
        class="flex h-5 w-28 items-center sm:h-11 sm:w-40"
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

      <div class="hidden min-w-0 text-center md:block">
        <h1 class="truncate text-sm font-semibold sm:text-base">
          {{ projectTitle ?? "Galeri Foto" }}
        </h1>

        <p class="mt-0.5 truncate text-xs text-white/70 dark:text-[#083182]/70 sm:text-sm">
          {{ clientName ?? "Client" }}
        </p>
      </div>

      <div class="justify-self-end text-right">
        <p class="text-sm font-semibold leading-none sm:text-lg">
          {{ selectedCount }} / {{ selectionLimit }}
        </p>

        <p
          class="mt-0.5 text-[10px] leading-none text-white/70 dark:text-[#083182]/70 sm:mt-1 sm:text-[11px]"
        >
          {{ photoCount }} foto
        </p>
      </div>
    </div>
  </header>
</template>
