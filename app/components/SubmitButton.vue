<script lang="ts" setup>
type Props = {
  selectedCount: number;
  selectLimit: number;
};

const props = defineProps<Props>();
</script>

<template>
  <ClientOnly>
    <div class="fixed bottom-3 md:bottom-5 w-full">
      <div class="flex justify-center">
        <div
          class="flex w-fit items-center px-1.5 py-1.5 rounded-full gap-2 text-white bg-[#083182] font-medium text-xs md:text-sm dark:bg-[#d0dbee] dark:text-[#083182] shadow-xl shadow-[#083182]/25"
        >
          <span class="pl-2">
            <span class="font-bold">
              [{{ selectedCount }}/{{ selectLimit || 0 }}]
            </span>
            Done picking your photo?
          </span>
          <UButton
            class="rounded-full px-4 py-1 text-xs md:text-sm bg-[#d0dbee] text-[#083182] font-bold shadow-md shadow-[#083182]/25 transition hover:bg-[#d0dbee] focus-visible:ring-[#083182]/40! dark:bg-[#083182]! dark:text-[#d0dbee]! dark:hover:bg-[#eaf0fb]! dark:active:bg-[#eaf0fb]! dark:focus-visible:ring-[#d0dbee]/50!"
            color="primary"
            variant="solid"
            @click="$router.push('/')"
          >
            Submit
          </UButton>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
