<script setup lang="ts">
const toast = useToast();
const isLoggingOut = ref(false);

async function logout() {
  if (isLoggingOut.value) {
    return;
  }

  isLoggingOut.value = true;

  try {
    await $fetch("/api/access/logout", {
      method: "POST",
    });

    toast.add({
      color: "primary",
      description: "Session galeri sudah dihapus.",
      title: "Logout berhasil",
    });

    await navigateTo("/");
  } catch (error) {
    toast.add({
      color: "error",
      description:
        error instanceof Error ? error.message : "Session gagal dihapus.",
      title: "Logout gagal",
    });
  } finally {
    isLoggingOut.value = false;
  }
}
</script>

<template>
  <ClientOnly>
    <UButton
      aria-label="Logout dari galeri"
      class="cursor-pointer fixed bottom-5 left-5 z-40 rounded-full bg-[#083182]! text-white! shadow-xl shadow-[#083182]/25 transition hover:bg-[#062764]! active:bg-[#062764]! focus-visible:ring-[#083182]/40! dark:bg-[#d0dbee]! dark:text-[#083182]! dark:hover:bg-[#eaf0fb]! dark:active:bg-[#eaf0fb]! dark:focus-visible:ring-[#d0dbee]/50!"
      color="neutral"
      :loading="isLoggingOut"
      size="xl"
      square
      variant="solid"
      @click="logout"
    >
      <UIcon
        v-if="!isLoggingOut"
        name="i-lucide-log-out"
        class="size-5 text-current"
      />
    </UButton>
  </ClientOnly>
</template>
