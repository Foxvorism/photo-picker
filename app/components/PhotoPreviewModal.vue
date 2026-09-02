<script setup lang="ts">
type PreviewPhoto = {
  filename: string;
  id: string;
  previewUrl: string;
  selected: boolean;
};

type Props = {
  open: boolean;
  photo: PreviewPhoto | null;
  readonly?: boolean;
  selected?: boolean;
};

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  toggle: [photo: PreviewPhoto];
  "update:open": [open: boolean];
}>();

function updateOpen(open: boolean) {
  emit("update:open", open);

  if (!open) {
    emit("close");
  }
}
</script>

<template>
  <UModal
    :close="false"
    :dismissible="true"
    :open="open"
    :ui="{
      overlay: 'bg-[#020b1f]/90 backdrop-blur-sm',
      content:
        'bg-transparent! shadow-none! ring-0! p-0! w-auto! max-w-none! overflow-visible!',
    }"
    @update:open="updateOpen"
  >
    <template #content>
      <div
        v-if="photo"
        class="relative flex max-h-[94dvh] max-w-[96vw] items-center justify-center"
      >
        <img
          :alt="photo.filename"
          class="block h-auto max-h-[94dvh] w-auto max-w-[96vw] rounded-lg object-contain shadow-2xl shadow-black/40"
          :src="photo.previewUrl"
        />

        <UButton
          aria-label="Tutup preview"
          class="absolute left-2 top-2 rounded-full bg-white/90! text-[#083182]! shadow-lg shadow-black/20 ring-1 ring-white/60 backdrop-blur hover:bg-white! active:bg-white! dark:bg-[#d0dbee]/90! dark:text-[#083182]!"
          color="neutral"
          icon="i-lucide-x"
          size="lg"
          square
          type="button"
          variant="solid"
          @click="emit('close')"
        />

        <UButton
          v-if="!readonly"
          :aria-label="selected ? 'Foto sudah dipilih' : 'Pilih foto'"
          :aria-pressed="selected"
          :class="
            selected ? 'bg-[#083182]! text-white!' : 'bg-white/25! text-white!'
          "
          class="absolute right-2 top-2 rounded-full shadow-lg shadow-black/20 ring-1 ring-white/70 backdrop-blur hover:bg-white/80! hover:text-gray-950! md:right-3 md:top-3"
          :color="selected ? 'primary' : 'neutral'"
          icon="i-lucide-check"
          size="lg"
          square
          type="button"
          :variant="selected ? 'solid' : 'ghost'"
          @click="emit('toggle', photo)"
        />
      </div>
    </template>
  </UModal>
</template>
