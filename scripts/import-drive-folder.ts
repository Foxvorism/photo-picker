import "dotenv/config";

import { parseArgs } from "node:util";
import {
  createDriveClient,
  createSupabaseScriptClient,
  getSupabaseBucket,
  importDriveFolder,
} from "./drive-importer.js";

const { values } = parseArgs({
  options: {
    project: {
      type: "string",
    },
    folder: {
      type: "string",
    },
  },
});

function printUsageAndExit(): never {
  console.error(`
Penggunaan:
npm run import:drive -- --project="PROJECT_UUID" --folder="LINK_ATAU_FOLDER_ID"
  `);

  process.exit(1);
}

function getRequiredArgument(value: string | boolean | undefined) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  printUsageAndExit();
}

async function main() {
  const projectId = getRequiredArgument(values.project);
  const folderInput = getRequiredArgument(values.folder);
  const supabase = createSupabaseScriptClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, status")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(
      `Project Supabase tidak ditemukan: ${projectError?.message ?? ""}`,
    );
  }

  if (!["draft", "open"].includes(project.status)) {
    throw new Error(
      `Project berstatus "${project.status}" dan tidak boleh di-import`,
    );
  }

  console.log(`Membaca folder Drive untuk project: ${project.title}`);

  const result = await importDriveFolder({
    drive: createDriveClient(),
    folderInput,
    projectId,
    supabase,
    supabaseBucket: getSupabaseBucket(),
  });

  console.log("");
  console.log("Import selesai");
  console.log(`Berhasil: ${result.successCount}`);
  console.log(`Gagal: ${result.failedCount}`);

  if (result.failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
