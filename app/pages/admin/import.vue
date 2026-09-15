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
const vendorPassword = ref("");
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

  return "Could not create the import job.";
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
        vendorPassword: vendorPassword.value,
      },
    });

    importJob.value = response;

    toast.add({
      color: response.created ? "success" : "warning",
      description: response.created
        ? "The project is open. The worker can now process this job."
        : "The project is open and already has a pending or processing job.",
      title: response.created ? "Import job created" : "Import job already exists",
    });
  } catch (error) {
    toast.add({
      color: "error",
      description: getErrorMessage(error),
      title: "Import job failed",
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
            will import and convert the photos. Use the password for the vendor that owns the project. The project will become open when the job is queued.
          </p>
        </div>

        <UFormField label="Vendor Password" for="vendor-password">
          <UInput
            v-model="vendorPassword"
            autocomplete="current-password"
            class="w-full"
            placeholder="Password for the project vendor"
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
            vendorPassword.trim().length === 0 || accessCode.trim().length === 0
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
