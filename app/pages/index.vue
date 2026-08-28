<script setup lang="ts">
const toast = useToast();
const accessCode = ref("");
const isSubmitting = ref(false);

async function verifyAccessCode() {
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await $fetch<{ valid: boolean }>("/api/access/verify", {
      method: "POST",
      body: {
        code: accessCode.value,
      },
    });

    if (response.valid) {
      toast.add({
        title: "Kode akses valid",
        description: "Session project sudah aktif.",
        color: "success",
      });
      return;
    }

    toast.add({
      title: "Kode akses tidak valid",
      description: "Periksa kembali kode yang diberikan.",
      color: "error",
    });
  } catch (error) {
    toast.add({
      title: "Verifikasi gagal",
      description: error instanceof Error ? error.message : "Coba lagi sebentar lagi.",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50 p-6">
    <UCard class="w-full max-w-md">
      <form
        class="space-y-5"
        @submit.prevent="verifyAccessCode"
      >
        <div>
          <h1 class="text-2xl font-bold">Graduation Photo Picker</h1>

          <p class="mt-2 text-sm text-gray-500">
            Masukkan kode unik untuk membuka galeri foto.
          </p>
        </div>

        <UFormField label="Kode akses">
          <UInput
            v-model="accessCode"
            autocomplete="one-time-code"
            class="w-full"
            placeholder="Contoh: A7K2Q9-M8PL"
          />
        </UFormField>

        <UButton
          block
          :disabled="accessCode.trim().length === 0"
          :loading="isSubmitting"
          type="submit"
        >
          Cek kode akses
        </UButton>
      </form>
    </UCard>
  </main>
</template>
