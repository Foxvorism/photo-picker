import path from "node:path";
import { basename, extname } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { google, type drive_v3 } from "googleapis";
import sharp from "sharp";

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

type DriveFile = drive_v3.Schema$File & {
  id: string;
  name: string;
};

export type ImportProgress = {
  failedCount: number;
  processedCount: number;
  successCount: number;
  totalCount: number;
};

type ImportDriveFolderInput = {
  drive: drive_v3.Drive;
  folderInput: string;
  onProgress?: (progress: ImportProgress) => Promise<void> | void;
  projectId: string;
  supabase: SupabaseClient;
  supabaseBucket: string;
};

export type ImportDriveFolderResult = ImportProgress;

function hasDriveFileIdentity(file: drive_v3.Schema$File): file is DriveFile {
  return typeof file.id === "string" && typeof file.name === "string";
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} belum dikonfigurasi`);
  }

  return value;
}

export function createSupabaseScriptClient() {
  return createClient(
    getRequiredEnv("NUXT_SUPABASE_URL"),
    getRequiredEnv("NUXT_SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

export function createDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(getRequiredEnv("GOOGLE_APPLICATION_CREDENTIALS")),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({
    version: "v3",
    auth,
  });
}

export function getSupabaseBucket() {
  return process.env.NUXT_SUPABASE_BUCKET ?? "photo-previews";
}

export function extractFolderId(input: string) {
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

export async function importDriveFolder({
  drive,
  folderInput,
  onProgress,
  projectId,
  supabase,
  supabaseBucket,
}: ImportDriveFolderInput): Promise<ImportDriveFolderResult> {
  const folderId = extractFolderId(folderInput);
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

  let successCount = 0;
  let failedCount = 0;

  await onProgress?.({
    failedCount,
    processedCount: 0,
    successCount,
    totalCount: jpgFiles.length,
  });

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

    await onProgress?.({
      failedCount,
      processedCount: index + 1,
      successCount,
      totalCount: jpgFiles.length,
    });
  }

  return {
    failedCount,
    processedCount: jpgFiles.length,
    successCount,
    totalCount: jpgFiles.length,
  };
}
