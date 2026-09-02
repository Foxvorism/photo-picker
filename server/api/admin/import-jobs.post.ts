import { timingSafeEqual } from "node:crypto";
import {
  createError,
  defineEventHandler,
  readBody,
  useRuntimeConfig,
} from "#imports";
import {
  normalizeAccessCode,
  isValidAccessCodeInput,
} from "../../utils/access-code";
import { assertRateLimit } from "../../utils/rate-limit";
import { createSupabaseAdmin } from "../../utils/supabase";

type ImportJobRequestBody = {
  accessCode?: unknown;
  adminSecret?: unknown;
};

type ProjectRow = {
  drive_folder_id: string | null;
  id: string;
  status: string;
  title: string;
};

type ImportJobRow = {
  id: string;
};

function isValidAdminSecret(input: string, expectedSecret: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expectedSecret);

  return (
    inputBuffer.length === expectedBuffer.length &&
    timingSafeEqual(inputBuffer, expectedBuffer)
  );
}

async function verifyImportAccess(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  accessCode: string,
) {
  const { data, error } = await supabase.rpc("verify_project_import_access", {
    input_code: accessCode,
  });

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Function verify_project_import_access belum tersedia.",
    });
  }

  if (typeof data !== "string" || !data) {
    return null;
  }

  return data;
}

export default defineEventHandler(async (event) => {
  assertRateLimit(event, "admin-import-job");

  const config = useRuntimeConfig(event);
  const expectedAdminSecret = String(config.adminSecretKey ?? "");

  if (!expectedAdminSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Admin import secret belum dikonfigurasi.",
    });
  }

  const body = await readBody<ImportJobRequestBody>(event);

  if (
    typeof body.adminSecret !== "string" ||
    !isValidAdminSecret(body.adminSecret, expectedAdminSecret)
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: "Admin password tidak valid.",
    });
  }

  if (typeof body.accessCode !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Kode akses project wajib diisi.",
    });
  }

  const accessCode = normalizeAccessCode(body.accessCode);

  if (!isValidAccessCodeInput(accessCode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Kode akses project tidak valid.",
    });
  }

  const supabase = createSupabaseAdmin(event);
  const projectId = await verifyImportAccess(supabase, accessCode);

  if (!projectId) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project tidak ditemukan atau tidak bisa di-import.",
    });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,title,status,drive_folder_id")
    .eq("id", projectId)
    .single<ProjectRow>();

  if (projectError || !project) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project tidak ditemukan.",
    });
  }

  if (!["draft", "open"].includes(project.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Project berstatus "${project.status}" dan tidak boleh di-import.`,
    });
  }

  if (!project.drive_folder_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Drive folder ID belum diisi di project.",
    });
  }

  const { data: existingJob, error: existingJobError } = await supabase
    .from("import_jobs")
    .select("id")
    .eq("project_id", project.id)
    .in("status", ["pending", "processing"])
    .maybeSingle<ImportJobRow>();

  if (existingJobError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Status import job belum bisa dicek.",
    });
  }

  if (existingJob) {
    return {
      created: false,
      jobId: existingJob.id,
      project: {
        id: project.id,
        title: project.title,
      },
    };
  }

  const { data: importJob, error: importJobError } = await supabase
    .from("import_jobs")
    .insert({
      drive_folder_id: project.drive_folder_id,
      project_id: project.id,
      status: "pending",
    })
    .select("id")
    .single<ImportJobRow>();

  if (importJobError || !importJob) {
    throw createError({
      statusCode: 500,
      statusMessage: "Import job gagal dibuat.",
    });
  }

  return {
    created: true,
    jobId: importJob.id,
    project: {
      id: project.id,
      title: project.title,
    },
  };
});
