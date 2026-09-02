import "dotenv/config";

import { parseArgs } from "node:util";
import {
  createDriveClient,
  createSupabaseScriptClient,
  getSupabaseBucket,
  type ImportProgress,
  importDriveFolder,
} from "./drive-importer.js";

type ImportJobRow = {
  drive_folder_id: string;
  id: string;
  project_id: string;
};

type ProjectRow = {
  status: string;
  title: string;
};

const { values } = parseArgs({
  options: {
    interval: {
      default: "15",
      type: "string",
    },
    once: {
      default: false,
      type: "boolean",
    },
  },
});

const pollIntervalSeconds = Math.max(
  3,
  Number.parseInt(String(values.interval), 10) || 15,
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Import worker gagal.";
}

async function getNextPendingJob(
  supabase: ReturnType<typeof createSupabaseScriptClient>,
) {
  const { data: pendingJob, error: pendingJobError } = await supabase
    .from("import_jobs")
    .select("id,project_id,drive_folder_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ImportJobRow>();

  if (pendingJobError) {
    throw new Error(`Gagal membaca import job: ${pendingJobError.message}`);
  }

  if (!pendingJob) {
    return null;
  }

  const { data: claimedJob, error: claimJobError } = await supabase
    .from("import_jobs")
    .update({
      error: null,
      failed_count: 0,
      finished_at: null,
      started_at: new Date().toISOString(),
      status: "processing",
      success_count: 0,
      total_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pendingJob.id)
    .eq("status", "pending")
    .select("id,project_id,drive_folder_id")
    .maybeSingle<ImportJobRow>();

  if (claimJobError) {
    throw new Error(`Gagal mengambil import job: ${claimJobError.message}`);
  }

  return claimedJob;
}

async function processJob(
  supabase: ReturnType<typeof createSupabaseScriptClient>,
  job: ImportJobRow,
) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("title,status")
    .eq("id", job.project_id)
    .single<ProjectRow>();

  if (projectError || !project) {
    throw new Error(
      `Project tidak ditemukan: ${projectError?.message ?? ""}`,
    );
  }

  if (!["draft", "open"].includes(project.status)) {
    throw new Error(
      `Project berstatus "${project.status}" dan tidak boleh di-import`,
    );
  }

  console.log("");
  console.log(`Memproses job ${job.id}`);
  console.log(`Project: ${project.title}`);

  const result = await importDriveFolder({
    drive: createDriveClient(),
    folderInput: job.drive_folder_id,
    onProgress: async (progress: ImportProgress) => {
      await supabase
        .from("import_jobs")
        .update({
          failed_count: progress.failedCount,
          success_count: progress.successCount,
          total_count: progress.totalCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    },
    projectId: job.project_id,
    supabase,
    supabaseBucket: getSupabaseBucket(),
  });

  await supabase
    .from("import_jobs")
    .update({
      failed_count: result.failedCount,
      finished_at: new Date().toISOString(),
      status: result.failedCount > 0 ? "failed" : "completed",
      success_count: result.successCount,
      total_count: result.totalCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  console.log("");
  console.log(`Job selesai: ${job.id}`);
  console.log(`Berhasil: ${result.successCount}`);
  console.log(`Gagal: ${result.failedCount}`);
}

async function runWorker() {
  const supabase = createSupabaseScriptClient();

  console.log("Import worker aktif");
  console.log(`Mode: ${values.once ? "once" : "polling"}`);
  console.log(`Interval: ${pollIntervalSeconds} detik`);

  do {
    const job = await getNextPendingJob(supabase);

    if (!job) {
      console.log("Tidak ada import job pending.");

      if (values.once) {
        return;
      }

      await sleep(pollIntervalSeconds * 1000);
      continue;
    }

    try {
      await processJob(supabase, job);
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      await supabase
        .from("import_jobs")
        .update({
          error: errorMessage.slice(0, 1000),
          finished_at: new Date().toISOString(),
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      console.error(`Job gagal: ${job.id}`);
      console.error(errorMessage);

      if (values.once) {
        process.exitCode = 1;
        return;
      }
    }
  } while (!values.once);
}

runWorker().catch((error) => {
  console.error(getErrorMessage(error));

  process.exit(1);
});
