import "dotenv/config";

import path from "node:path";
import { basename, extname } from "node:path";
import { parseArgs } from "node:util";

import { google, type drive_v3 } from "googleapis";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const RAW_EXTENSIONS = new Set([
  ".cr2",
  ".cr3",
  ".nef",
  ".arw",
  ".raf",
  ".dng",
  ".orf",
  ".rw2",
]);

const JPG_EXTENSIONS = new Set([".jpg", ".jpeg"]);

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

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} belum dikonfigurasi`);
  }

  return value;
}

type DriveFile = drive_v3.Schema$File & {
  id: string;
  name: string;
};

function hasDriveFileIdentity(file: drive_v3.Schema$File): file is DriveFile {
  return typeof file.id === "string" && typeof file.name === "string";
}

const projectId = getRequiredArgument(values.project);
const folderInput = getRequiredArgument(values.folder);
const supabaseUrl = getRequiredEnv("NUXT_SUPABASE_URL");
const supabaseSecretKey = getRequiredEnv("NUXT_SUPABASE_SECRET_KEY");
const credentialsPath = getRequiredEnv("GOOGLE_APPLICATION_CREDENTIALS");
const supabaseBucket = process.env.NUXT_SUPABASE_BUCKET ?? "photo-previews";

function extractFolderId(input: string) {
  const normalized = input.trim();

  const linkMatch = normalized.match(
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
  );

  if (linkMatch?.[1]) {
    return linkMatch[1];
  }

  if (/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    return normalized;
  }

  throw new Error("Link atau folder ID Google Drive tidak valid");
}

function getExtension(filename: string) {
  return extname(filename).toLowerCase();
}

function getStem(filename: string) {
  const extension = extname(filename);

  return basename(filename, extension).toLowerCase();
}

async function listFolderFiles(drive: drive_v3.Drive, folderId: string) {
  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    files.push(...(response.data.files ?? []));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files.filter(hasDriveFileIdentity);
}

async function downloadDriveFile(drive: drive_v3.Drive, fileId: string) {
  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    {
      responseType: "arraybuffer",
    },
  );

  return Buffer.from(response.data as ArrayBuffer);
}

async function main() {
  const folderId = extractFolderId(folderInput);

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

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

  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(credentialsPath),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  const drive = google.drive({
    version: "v3",
    auth,
  });

  console.log(`Membaca folder Drive untuk project: ${project.title}`);

  const files = await listFolderFiles(drive, folderId);

  const rawByStem = new Map<string, drive_v3.Schema$File>();

  for (const file of files) {
    const filename = file.name;
    const extension = getExtension(filename);

    if (RAW_EXTENSIONS.has(extension)) {
      rawByStem.set(getStem(filename), file);
    }
  }

  const jpgFiles = files.filter((file) =>
    JPG_EXTENSIONS.has(getExtension(file.name)),
  );

  if (jpgFiles.length === 0) {
    throw new Error(
      "Tidak ada file JPG/JPEG yang ditemukan dalam folder Drive",
    );
  }

  console.log(`${jpgFiles.length} file JPG/JPEG ditemukan`);

  let successCount = 0;
  let failedCount = 0;

  for (const [index, jpgFile] of jpgFiles.entries()) {
    const jpgName = jpgFile.name;
    const jpgId = jpgFile.id;
    const stem = getStem(jpgName);

    const pairedRaw = rawByStem.get(stem);

    const originalFilename = pairedRaw?.name ?? jpgName;
    const originalDriveFileId = pairedRaw?.id ?? jpgId;

    const previewPath = `${projectId}/${jpgId}.webp`;

    try {
      console.log(`[${index + 1}/${jpgFiles.length}] Memproses ${jpgName}`);

      const jpgBuffer = await downloadDriveFile(drive, jpgId);

      const webpBuffer = await sharp(jpgBuffer, {
        failOn: "warning",
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: 78,
          effort: 4,
        })
        .toBuffer();

      const { error: uploadError } = await supabase.storage
        .from(supabaseBucket)
        .upload(previewPath, webpBuffer, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload gagal: ${uploadError.message}`);
      }

      const { error: databaseError } = await supabase.from("photos").upsert(
        {
          project_id: projectId,
          filename: originalFilename,
          drive_file_id: originalDriveFileId,
          preview_path: previewPath,
          thumbnail_path: null,
          sort_order: index + 1,
          is_visible: true,
        },
        {
          onConflict: "project_id,filename",
        },
      );

      if (databaseError) {
        await supabase.storage.from(supabaseBucket).remove([previewPath]);

        throw new Error(`Database gagal: ${databaseError.message}`);
      }

      successCount += 1;

      console.log(`Berhasil: ${originalFilename} -> ${previewPath}`);
    } catch (error) {
      failedCount += 1;

      console.error(
        `Gagal memproses ${jpgName}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log("");
  console.log("Import selesai");
  console.log(`Berhasil: ${successCount}`);
  console.log(`Gagal: ${failedCount}`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
