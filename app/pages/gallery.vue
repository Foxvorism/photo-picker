<script setup lang="ts">
import SubmitButton from "~/components/SubmitButton.vue";

type GalleryPhoto = {
  id: string;
  filename: string;
  previewUrl: string;
  selected: boolean;
};

type GalleryResponse = {
  project: {
    title: string;
    clientName: string;
    selectionLimit: number;
    status: string;
  };
  photos: GalleryPhoto[];
  selectedCount: number;
};

const toast = useToast();

const {
  data: gallery,
  error,
  pending,
  refresh,
} = await useFetch<GalleryResponse>("/api/gallery");

if (error.value?.statusCode === 401) {
  await navigateTo("/");
}

watch(error, async (currentError) => {
  if (currentError?.statusCode === 401) {
    await navigateTo("/");
  }
});

const isSubmitted = computed(
  () => gallery.value?.project.status === "submitted",
);

const selectedPhotoIds = ref<Set<string>>(new Set());
const showSelectedOnly = ref(false);

watch(
  gallery,
  (currentGallery) => {
    selectedPhotoIds.value = new Set(
      currentGallery?.photos
        .filter((photo) => photo.selected)
        .map((photo) => photo.id) ?? [],
    );
  },
  { immediate: true },
);

const selectedPhotoCount = computed(() => {
  return selectedPhotoIds.value.size;
});

const filteredPhotos = computed(() => {
  const photos = gallery.value?.photos ?? [];

  if (!showSelectedOnly.value) {
    return photos;
  }

  return photos.filter((photo) => selectedPhotoIds.value.has(photo.id));
});

function isPhotoSelected(photoId: string) {
  return selectedPhotoIds.value.has(photoId);
}

function togglePhotoSelection(photo: GalleryPhoto) {
  if (isSubmitted.value) {
    return;
  }

  const selectionLimit = gallery.value?.project.selectionLimit ?? 0;
  const nextSelectedPhotoIds = new Set(selectedPhotoIds.value);
  const isSelected = nextSelectedPhotoIds.has(photo.id);

  if (!isSelected && nextSelectedPhotoIds.size >= selectionLimit) {
    toast.add({
      color: "warning",
      description: `Maksimal ${selectionLimit} foto bisa dipilih.`,
      title: "Batas pilihan tercapai",
    });
    return;
  }

  if (isSelected) {
    nextSelectedPhotoIds.delete(photo.id);
  } else {
    nextSelectedPhotoIds.add(photo.id);
  }

  selectedPhotoIds.value = nextSelectedPhotoIds;

  if (showSelectedOnly.value) {
    nextTick(resizeAllMasonryItems);
  }
}

function getMasonryAspectRatios(columnCount: number) {
  if (columnCount >= 4) {
    return {
      landscapeMinAspectRatio: 0.66,
      portraitMaxAspectRatio: 1.36,
    };
  }

  if (columnCount === 3) {
    return {
      landscapeMinAspectRatio: 0.68,
      portraitMaxAspectRatio: 1.42,
    };
  }

  return {
    landscapeMinAspectRatio: 0.71,
    portraitMaxAspectRatio: 1.5,
  };
}

function resizeMasonryImage(image: HTMLImageElement) {
  const item = image.closest<HTMLElement>("[data-masonry-item]");
  const photoCard = image.parentElement;
  const grid = item?.parentElement;

  if (!item || !photoCard || !grid || image.naturalWidth === 0) {
    return;
  }

  const columnCount =
    getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const { landscapeMinAspectRatio, portraitMaxAspectRatio } =
    getMasonryAspectRatios(columnCount);
  const naturalAspectRatio = image.naturalHeight / image.naturalWidth;
  const renderedWidth = image.getBoundingClientRect().width;
  const naturalRenderedHeight = renderedWidth * naturalAspectRatio;
  const visualHeight =
    naturalAspectRatio > 1
      ? Math.min(naturalRenderedHeight, renderedWidth * portraitMaxAspectRatio)
      : Math.max(
          naturalRenderedHeight,
          renderedWidth * landscapeMinAspectRatio,
        );

  photoCard.style.height = `${visualHeight}px`;

  const rowGap = grid
    ? Number.parseFloat(getComputedStyle(grid).rowGap) || 0
    : 0;
  const rowHeight = grid
    ? Number.parseFloat(getComputedStyle(grid).gridAutoRows) || 4
    : 4;
  const renderedHeight = photoCard.getBoundingClientRect().height;
  const rowSpan = Math.max(
    1,
    Math.ceil((renderedHeight + rowGap) / (rowHeight + rowGap)),
  );

  item.style.gridRowEnd = `span ${rowSpan}`;
}

function resizeMasonryItem(event: Event) {
  const image = event.target;

  if (image instanceof HTMLImageElement) {
    resizeMasonryImage(image);
  }
}

function resizeAllMasonryItems() {
  document
    .querySelectorAll<HTMLImageElement>("[data-masonry-item] img")
    .forEach((image) => {
      if (image.complete) {
        resizeMasonryImage(image);
      }
    });
}

watch(showSelectedOnly, async () => {
  await nextTick();
  resizeAllMasonryItems();
});

onMounted(() => {
  window.addEventListener("resize", resizeAllMasonryItems);
  requestAnimationFrame(resizeAllMasonryItems);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeAllMasonryItems);
});
</script>

<template>
  <main
    class="min-h-screen bg-[#f3f6fb] transition-colors duration-300 dark:bg-[#020b1f]"
  >
    <div class="mx-auto flex w-full flex-col gap-3 px-2 py-3 sm:px-4 lg:px-5">
      <Header
        :client-name="gallery?.project.clientName"
        :photo-count="gallery?.photos.length ?? 0"
        :project-title="gallery?.project.title"
        :selected-count="selectedPhotoCount"
        :selection-limit="gallery?.project.selectionLimit ?? 0"
      />

      <UAlert
        v-if="isSubmitted"
        color="success"
        description="Pilihan foto untuk project ini sudah difinalisasi."
        title="Project sudah dikirim"
        variant="soft"
      />

      <section
        v-if="pending"
        class="grid grid-cols-2 gap-x-2.5 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4"
      >
        <USkeleton
          v-for="index in 8"
          :key="index"
          class="h-56 rounded-lg even:h-72"
        />
      </section>

      <UAlert
        v-else-if="error"
        color="error"
        description="Silakan masukkan kode akses lagi dari halaman awal."
        title="Galeri belum bisa dibuka"
        variant="soft"
      >
        <template #actions>
          <div class="flex gap-2">
            <UButton
              color="error"
              label="Coba lagi"
              variant="soft"
              @click="refresh()"
            />

            <UButton
              color="neutral"
              label="Ke halaman kode"
              to="/"
              variant="ghost"
            />
          </div>
        </template>
      </UAlert>

      <UAlert
        v-else-if="gallery?.photos.length === 0"
        color="neutral"
        description="Belum ada foto visible untuk project ini."
        title="Galeri kosong"
        variant="soft"
      />

      <UAlert
        v-else-if="showSelectedOnly && filteredPhotos.length === 0"
        color="neutral"
        description="Belum ada foto yang dipilih."
        title="Filter kosong"
        variant="soft"
      />

      <div v-else class="flex w-full justify-center">
        <section
          class="w-[99%] grid grid-flow-row-dense auto-rows-1 grid-cols-2 gap-x-2.5 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4"
        >
          <article
            v-for="photo in filteredPhotos"
            :key="photo.id"
            class="relative self-start"
            data-masonry-item
            style="grid-row-end: span 32"
          >
            <div
              class="group relative overflow-hidden rounded-lg border-2 border-[#083182]/95 bg-gray-100 shadow-sm dark:border-[#d0dbee] dark:bg-[#083182]/20"
              tabindex="0"
            >
              <img
                :alt="photo.filename"
                class="block h-full w-full object-cover object-top contrast-90 saturate-90 transition duration-300 hover:scale-105 hover:contrast-100 hover:saturate-100"
                loading="lazy"
                :src="photo.previewUrl"
                @load="resizeMasonryItem"
              />

              <div
                class="pointer-events-none absolute inset-0 opacity-0 shadow-[inset_0_-96px_64px_-48px_rgba(0,0,0,0.75),inset_0_0_0_1px_rgba(255,255,255,0.16)] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
              />

              <p
                class="pointer-events-none absolute inset-x-0 bottom-0 truncate px-3 pb-3 pt-8 text-sm font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {{ photo.filename }}
              </p>

              <UButton
                :aria-label="
                  isPhotoSelected(photo.id)
                    ? 'Foto sudah dipilih'
                    : 'Pilih foto'
                "
                :aria-pressed="isPhotoSelected(photo.id)"
                :class="
                  isPhotoSelected(photo.id)
                    ? 'bg-[#083182] text-white dark:bg-[#d0dbee] dark:text-[#083182]'
                    : 'bg-white/15 text-gray-50'
                "
                class="absolute right-2 top-2 rounded-full shadow-sm ring-1 ring-white/60 backdrop-blur transition hover:bg-white/80 hover:text-gray-950"
                :color="isPhotoSelected(photo.id) ? 'primary' : 'neutral'"
                :disabled="isSubmitted"
                icon="i-lucide-check"
                size="sm"
                square
                :variant="isPhotoSelected(photo.id) ? 'solid' : 'ghost'"
                @click.stop="togglePhotoSelection(photo)"
              />
            </div>
          </article>
        </section>
      </div>

      <div
        class="w-full text-center text-xs text-[#083182]/50 dark:text-white/50"
      >
        <p>
          Displaying {{ filteredPhotos.length }} of
          {{ gallery?.photos.length || 0 }} photos
        </p>
      </div>
    </div>

    <FilterSelectedButton
      v-model="showSelectedOnly"
      :disabled="selectedPhotoCount === 0 && !showSelectedOnly"
    />
    <ColorModePicker />
    <SubmitButton
      v-if="selectedPhotoCount > 0"
      :selectedCount="selectedPhotoCount"
      :selectLimit="gallery?.project.selectionLimit || 0"
    />
  </main>
</template>
