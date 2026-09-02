<script lang="ts" setup>
type Props = {
  disabled?: boolean;
  loading?: boolean;
  selectedCount: number;
  selectLimit: number;
};

defineProps<Props>();

const emit = defineEmits<{
  submit: [];
}>();
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
            class="rounded-full cursor-pointer bg-[#d0dbee]! px-4 py-1 text-xs font-bold text-[#083182]! shadow-md shadow-[#083182]/25 transition hover:bg-[#c1c9e0]! active:bg-[#c1c9e0]! focus-visible:ring-[#083182]/40! dark:bg-[#083182]! dark:text-[#d0dbee]! dark:hover:bg-[#062764]! dark:active:bg-[#062764]! dark:focus-visible:ring-[#d0dbee]/50! md:text-sm"
            color="neutral"
            :disabled="disabled"
            :loading="loading"
            type="button"
            variant="solid"
            @click="emit('submit')"
          >
            Submit
          </UButton>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
