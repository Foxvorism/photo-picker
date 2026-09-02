<script setup lang="ts">
import sutooriLogoDark from "~/assets/images/sutoori-logo-dark.webp";
import sutooriLogoLight from "~/assets/images/sutoori-logo-light.webp";

type ImportJobResponse = {
  created: boolean;
  jobId: string;
  project: {
    id: string;
    title: string;
  };
};

const toast = useToast();
const adminSecret = ref("");
const accessCode = ref("");
const isSubmitting = ref(false);
const importJob = ref<ImportJobResponse | null>(null);

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data as { statusMessage?: string };

    if (data.statusMessage) {
      return data.statusMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Import job gagal dibuat.";
}

async function createImportJob() {
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;
  importJob.value = null;

  try {
    const response = await $fetch<ImportJobResponse>("/api/admin/import-jobs", {
      method: "POST",
      body: {
        accessCode: accessCode.value,
        adminSecret: adminSecret.value,
      },
    });

    importJob.value = response;

    toast.add({
      color: response.created ? "success" : "warning",
      description: response.created
        ? "Worker lokal bisa mulai memproses job ini."
        : "Project ini sudah punya job pending/processing.",
      title: response.created ? "Import job dibuat" : "Import job sudah ada",
    });
  } catch (error) {
    toast.add({
      color: "error",
      description: getErrorMessage(error),
      title: "Import job gagal",
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
      <form class="space-y-5" @submit.prevent="createImportJob">
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

          <p class="mt-2 text-sm text-gray-500 dark:text-white/60">
            Create an import job from the project access code. The local worker
            will import and convert the photos.
          </p>
        </div>

        <UFormField label="Admin Password" for="admin-secret">
          <UInput
            v-model="adminSecret"
            autocomplete="current-password"
            class="w-full"
            placeholder="Admin import password"
            type="password"
            :ui="{
              base: 'outline-[#083182]! ring-[#083182]/20! focus-visible:outline-[#083182]/75! focus-visible:ring-2! focus-visible:ring-[#083182]/50! focus-visible:ring-offset-2! dark:outline-[#d0dbee]! dark:ring-[#d0dbee]/20! dark:focus-visible:outline-[#d0dbee]/75! dark:focus-visible:ring-[#d0dbee]/50! dark:focus-visible:ring-offset-[#07142d]!',
            }"
          />
        </UFormField>

        <UFormField label="Project Access Code" for="project-access-code">
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
          :disabled="
            adminSecret.trim().length === 0 || accessCode.trim().length === 0
          "
          :loading="isSubmitting"
          type="submit"
        >
          Create Import Job
        </UButton>
      </form>
    </UCard>

    <ColorModePicker />
  </main>
</template>
