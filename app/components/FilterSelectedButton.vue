<script setup lang="ts">
type Props = {
  disabled?: boolean;
  modelValue: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

function toggleFilter() {
  if (props.disabled) {
    return;
  }

  emit("update:modelValue", !props.modelValue);
}
</script>

<template>
  <ClientOnly>
    <UButton
      :aria-label="
        modelValue ? 'Tampilkan semua foto' : 'Tampilkan foto terpilih saja'
      "
      :aria-pressed="modelValue"
      :class="
        modelValue
          ? 'bg-[#083182]! text-[#d0dbee]! dark:bg-[#d0dbee]! dark:text-[#083182]! outline-0!'
          : ''
      "
      class="fixed bottom-13.5 right-3 z-40 rounded-full bg-[#d0dbee] text-[#083182] outline-2 outline-[#083182] shadow-xl shadow-[#083182]/25 transition hover:bg-[#083182] hover:text-[#d0dbee] focus-visible:ring-[#083182]/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#083182] dark:text-[#d0dbee] dark:outline-[#d0dbee] dark:hover:bg-[#d0dbee] dark:hover:text-[#083182] dark:focus-visible:ring-[#d0dbee]/50 md:bottom-5 md:right-16"
      color="neutral"
      :disabled="disabled"
      size="xl"
      square
      variant="solid"
      @click="toggleFilter"
    >
      <UIcon
        v-if="modelValue"
        key="selected"
        name="keyline-icons:image-check-fill"
        class="size-5 text-current"
      />
      <UIcon
        v-else
        key="all"
        name="keyline-icons:image"
        class="size-5 text-current"
      />
    </UButton>
  </ClientOnly>
</template>
