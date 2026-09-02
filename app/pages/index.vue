<script setup lang="ts">
import sutooriLogoDark from "~/assets/images/sutoori-logo-dark.webp";
import sutooriLogoLight from "~/assets/images/sutoori-logo-light.webp";

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
        description: "Membuka galeri foto.",
        color: "success",
      });
      await navigateTo("/gallery");
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
      description:
        error instanceof Error ? error.message : "Coba lagi sebentar lagi.",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-[#f3f6fb] p-6 transition-colors duration-300 dark:bg-[#020b1f]"
  >
    <UCard
      class="w-full max-w-md border border-[#083182]/10 shadow-xl shadow-[#083182]/10 dark:border-[#d0dbee]/20 dark:bg-[#07142d]"
    >
      <form class="space-y-5" @submit.prevent="verifyAccessCode">
        <div>
          <div class="w-full p-10">
            <img
              alt="SUTOORI"
              class="block h-full w-full object-contain object-left dark:hidden"
              :src="sutooriLogoDark"
            />
            <img
              alt="SUTOORI"
              class="hidden h-full w-full object-contain object-left dark:block"
              :src="sutooriLogoLight"
            />
          </div>

          <!-- <h1 class="mt-1 text-2xl font-bold text-[#083182] dark:text-white">
            Pick A Pic
          </h1> -->

          <p class="mt-2 text-sm text-gray-500 dark:text-white/60">
            Thank you for using our service. Please enter the access code
            provided to you to view the photo gallery.
          </p>
        </div>

        <UFormField label="Access Code" for="access-code">
          <UInput
            v-model="accessCode"
            autocomplete="one-time-code"
            class="w-full"
            placeholder="e.g. 1234****-ABCD****"
            :ui="{
              base: 'outline-[#083182]! ring-[#083182]/20! focus-visible:outline-[#083182]/75! focus-visible:ring-2! focus-visible:ring-[#083182]/50! focus-visible:ring-offset-2! dark:outline-[#d0dbee]! dark:ring-[#d0dbee]/20! dark:focus-visible:outline-[#d0dbee]/75! dark:focus-visible:ring-[#d0dbee]/50! dark:focus-visible:ring-offset-[#07142d]!',
            }"
          />
        </UFormField>

        <UButton
          block
          class="bg-[#083182]! text-white hover:bg-[#062764]! dark:bg-[#d0dbee]! dark:text-[#083182]! dark:hover:bg-[#c1c9e0]!"
          :disabled="accessCode.trim().length === 0"
          :loading="isSubmitting"
          type="submit"
        >
          Verify Access Code
        </UButton>
      </form>
    </UCard>

    <ColorModePicker />
  </main>
</template>
