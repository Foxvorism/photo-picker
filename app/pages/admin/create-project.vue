<script setup lang="ts">
import sutooriLogoDark from "~/assets/images/sutoori-logo-dark.webp";
import sutooriLogoLight from "~/assets/images/sutoori-logo-light.webp";
import { projectVendors } from "~~/shared/utils/vendors";

const toast = useToast();
const vendor = ref("");
const password = ref("");
const verifiedVendor = ref<{ id: string; name: string } | null>(null);
const isRestoringSession = ref(true);
const isSubmitting = ref(false);
const isCopying = ref(false);
const createdProject = ref<{
  id: string;
  title: string;
  accessCode: string;
} | null>(null);
const form = reactive({
  title: "",
  client_name: "",
  client_phone: "",
  photographer_name: "",
  photographer_phone: "",
  drive_folder_id: "",
  selection_limit: 0,
});
const contactFields = [
  { key: "client_name", label: "Client Name", type: "text" },
  { key: "client_phone", label: "Client Phone", type: "tel" },
  { key: "photographer_name", label: "Photographer Name", type: "text" },
  { key: "photographer_phone", label: "Photographer Phone", type: "tel" },
] as const;
const buttonClass =
  "bg-[#083182]! text-white hover:bg-[#062764]! dark:bg-[#d0dbee]! dark:text-[#083182]! dark:hover:bg-[#c1c9e0]!";

function showError(error: unknown) {
  const data = (error as { data?: { statusMessage?: string } })?.data;
  toast.add({
    color: "error",
    title: "Request failed",
    description:
      (error as { statusCode?: number })?.statusCode === 429
        ? "Too many attempts. Please try again shortly."
        : data?.statusMessage || "Please try again shortly.",
  });
}

async function verifyVendor() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    verifiedVendor.value = await $fetch<{ id: string; name: string }>(
      "/api/admin/vendor/verify",
      {
        method: "POST",
        body: { vendor: vendor.value, password: password.value },
      },
    );
    password.value = "";
  } catch (error) {
    showError(error);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  try {
    // Fetch in the browser: the vendor cookie is scoped to /api/admin.
    const session = await $fetch<{
      vendor: { id: string; name: string } | null;
    }>("/api/admin/vendor/session");
    verifiedVendor.value = session.vendor;
  } catch (error) {
    showError(error);
  } finally {
    isRestoringSession.value = false;
  }
});

async function changeVendor() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    await $fetch("/api/admin/vendor/logout", { method: "POST", body: {} });
    verifiedVendor.value = null;
    vendor.value = "";
    password.value = "";
  } catch (error) {
    showError(error);
  } finally {
    isSubmitting.value = false;
  }
}

async function copyAccessCode() {
  if (!createdProject.value?.accessCode || isCopying.value) return;
  isCopying.value = true;
  try {
    await navigator.clipboard.writeText(createdProject.value.accessCode);
    toast.add({ color: "success", title: "Access code copied" });
  } catch {
    toast.add({
      color: "error",
      title: "Could not copy access code",
      description: "Please select the code and copy it manually.",
    });
  } finally {
    isCopying.value = false;
  }
}

async function createProject() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    createdProject.value = await $fetch<{
      id: string;
      title: string;
      accessCode: string;
    }>("/api/admin/projects", {
      method: "POST",
      body: {
        ...form,
        vendor: verifiedVendor.value?.id,
      },
    });
    toast.add({ color: "success", title: "Project created successfully" });
  } catch (error) {
    if ((error as { statusCode?: number })?.statusCode === 401)
      verifiedVendor.value = null;
    showError(error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4 py-10 transition-colors duration-300 dark:bg-[#020b1f]"
  >
    <UCard
      class="w-full border border-[#083182]/10 shadow-xl shadow-[#083182]/10 dark:border-[#d0dbee]/20 dark:bg-[#07142d]"
      :class="verifiedVendor && !createdProject ? 'max-w-2xl' : 'max-w-md'"
    >
      <div class="mx-auto w-full max-w-sm p-10">
        <img
          alt="SUTOORI"
          class="block w-full object-contain dark:hidden"
          :src="sutooriLogoDark"
        />
        <img
          alt="SUTOORI"
          class="hidden w-full object-contain dark:block"
          :src="sutooriLogoLight"
        />
      </div>

      <p
        v-if="isRestoringSession"
        role="status"
        class="text-sm text-gray-500 dark:text-white/60"
      >
        Checking vendor session...
      </p>

      <section v-else-if="createdProject" class="space-y-5" aria-live="polite">
        <h1 class="text-xl font-semibold">Project created successfully</h1>
        <p>{{ createdProject.title }}</p>
        <UFormField
          label="Project Access Code"
          description="Save this code to access the gallery and import photos. If you lose it, you can generate a new one by contacting the admin."
        >
          <UFieldGroup class="w-full">
            <UInput
              :model-value="createdProject.accessCode"
              readonly
              class="min-w-0 flex-1"
            />
            <UButton
              type="button"
              :class="buttonClass"
              :loading="isCopying"
              aria-label="Copy access code"
              @click="copyAccessCode"
              >Copy</UButton
            >
          </UFieldGroup>
        </UFormField>
        <UButton to="/admin/import" block :class="buttonClass"
          >Continue to Photo Import</UButton
        >
        <UButton variant="link" block to="/admin/create-project" external
          >Create Another Project</UButton
        >
      </section>

      <form
        v-else-if="!verifiedVendor"
        class="space-y-5"
        @submit.prevent="verifyVendor"
      >
        <div>
          <h1 class="text-xl font-semibold">Create Project</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-white/60">
            Select a vendor and enter its password to create a project.
          </p>
        </div>
        <UFormField label="Vendor" required>
          <USelect
            v-model="vendor"
            :items="projectVendors"
            value-key="id"
            label-key="name"
            placeholder="Select a vendor"
            class="w-full"
            :disabled="isSubmitting"
            required
          />
        </UFormField>
        <UFormField label="Vendor Password" required>
          <UInput
            v-model="password"
            autocomplete="current-password"
            type="password"
            placeholder="Vendor password"
            class="w-full"
            :disabled="isSubmitting"
            required
          />
        </UFormField>
        <UButton
          block
          type="submit"
          :class="buttonClass"
          :loading="isSubmitting"
          :disabled="!vendor || !password"
          >Verify Vendor</UButton
        >
      </form>

      <form v-else class="space-y-3" @submit.prevent="createProject">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-xl font-semibold">
              Create Project for {{ verifiedVendor.name }}
            </h1>
          </div>
          <UButton
            variant="link"
            class="text-sm text-[#083182] dark:text-white/60 underline"
            :disabled="isSubmitting"
            type="button"
            @click="changeVendor"
            >Change Vendor</UButton
          >
        </div>
        <UFormField label="Title" required>
          <UInput
            v-model="form.title"
            class="w-full"
            maxlength="200"
            placeholder="e.g. Graduation [Client Name]"
            required
          />
        </UFormField>
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField
            v-for="field in contactFields"
            :key="field.key"
            :label="field.label"
            required
          >
            <UFieldGroup v-if="field.type === 'tel'" class="w-full">
              <USelectMenu
                model-value="ID"
                :items="[{ label: 'ID +62', value: 'ID' }]"
                value-key="value"
                :search-input="false"
                disabled
                class="shrink-0"
              />
              <UInput
                v-model="form[field.key]"
                type="tel"
                inputmode="tel"
                autocomplete="tel-national"
                placeholder="812 3456 7890"
                class="min-w-0 flex-1"
                :maxlength="30"
                required
              />
            </UFieldGroup>
            <UInput
              v-else
              v-model="form[field.key]"
              :type="field.type"
              class="w-full"
              :maxlength="200"
              required
            />
          </UFormField>
        </div>
        <UFormField
          label="Google Drive Folder ID"
          help="Make sure to give viewer access to the folder"
          required
        >
          <UInput
            v-model="form.drive_folder_id"
            placeholder="Upload the JPG files to a Google Drive folder and paste the folder link here"
            class="w-full"
            required
          />
        </UFormField>
        <UFormField label="Selection Limit" required>
          <UInput
            v-model.number="form.selection_limit"
            type="number"
            :min="1"
            :max="50"
            :step="1"
            class="w-full"
            required
          />
        </UFormField>
        <UButton
          block
          type="submit"
          :class="buttonClass"
          :loading="isSubmitting"
          >Create Project</UButton
        >
      </form>
    </UCard>
    <ColorModePicker />
  </main>
</template>
