import { createError, defineEventHandler, readBody } from "#imports";
import { notifyPhotographerSelection } from "../../utils/selection-notification";
import { getProjectSession } from "../../utils/session";
import { createSupabaseAdmin } from "../../utils/supabase";

type FinalizeRequestBody = {
  photoIds?: unknown;
};

type ProjectRow = {
  id: string;
  title: string;
  client_name: string;
  photographer_name: string | null;
  photographer_phone: string | null;
  selection_limit: number;
  status: string;
};

type PhotoRow = {
  id: string;
  filename: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const filenameSorter = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function getUniquePhotoIds(input: unknown) {
  if (!Array.isArray(input)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Daftar foto tidak valid.",
    });
  }

  const photoIds = [...new Set(input)];

  if (!photoIds.every((photoId) => typeof photoId === "string" && uuidPattern.test(photoId))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Daftar foto tidak valid.",
    });
  }

  return photoIds as string[];
}

function getFinalizedFilenames(result: unknown, fallbackFilenames: string[]) {
  if (Array.isArray(result)) {
    if (result.every((item) => typeof item === "string")) {
      return result;
    }

    const filenames = result
      .map((item) => {
        if (item && typeof item === "object" && "filename" in item) {
          const filename = item.filename;
          return typeof filename === "string" ? filename : null;
        }

        return null;
      })
      .filter((filename): filename is string => Boolean(filename));

    if (filenames.length > 0) {
      return filenames;
    }
  }

  return fallbackFilenames;
}

export default defineEventHandler(async (event) => {
  const { projectId } = getProjectSession(event);
  const body = await readBody<FinalizeRequestBody>(event);
  const photoIds = getUniquePhotoIds(body.photoIds);

  if (photoIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Pilih minimal 1 foto sebelum submit.",
    });
  }

  const supabase = createSupabaseAdmin(event);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      "id,title,client_name,photographer_name,photographer_phone,selection_limit,status",
    )
    .eq("id", projectId)
    .single<ProjectRow>();

  if (projectError || !project) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project tidak ditemukan.",
    });
  }

  if (project.status === "submitted") {
    throw createError({
      statusCode: 409,
      statusMessage: "Project sudah pernah disubmit.",
    });
  }

  if (photoIds.length > project.selection_limit) {
    throw createError({
      statusCode: 400,
      statusMessage: `Maksimal ${project.selection_limit} foto bisa dipilih.`,
    });
  }

  if (!project.photographer_phone) {
    throw createError({
      statusCode: 400,
      statusMessage: "Nomor WhatsApp fotografer belum diisi di project.",
    });
  }

  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("id,filename")
    .eq("project_id", projectId)
    .eq("is_visible", true)
    .in("id", photoIds)
    .returns<PhotoRow[]>();

  if (photosError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Foto pilihan tidak bisa divalidasi.",
    });
  }

  if (photos.length !== photoIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ada foto pilihan yang tidak valid untuk project ini.",
    });
  }

  photos.sort((firstPhoto, secondPhoto) =>
    filenameSorter.compare(firstPhoto.filename, secondPhoto.filename),
  );

  const { error: deleteSelectionError } = await supabase
    .from("selections")
    .delete()
    .eq("project_id", projectId);

  if (deleteSelectionError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Pilihan lama tidak bisa diperbarui.",
    });
  }

  const { error: insertSelectionError } = await supabase
    .from("selections")
    .insert(
      photos.map((photo) => ({
        project_id: projectId,
        photo_id: photo.id,
      })),
    );

  if (insertSelectionError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Pilihan foto tidak bisa disimpan.",
    });
  }

  const { data: finalizeResult, error: finalizeError } = await supabase.rpc(
    "finalize_project",
    {
      input_project_id: projectId,
    },
  );

  if (finalizeError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Project tidak bisa difinalisasi.",
    });
  }

  const selectedFilenames = getFinalizedFilenames(
    finalizeResult,
    photos.map((photo) => photo.filename),
  ).sort((firstFilename, secondFilename) =>
    filenameSorter.compare(firstFilename, secondFilename),
  );

  const notification = await notifyPhotographerSelection(
    event,
    supabase,
    project,
    selectedFilenames,
  );

  return {
    selectedFilenames,
    selectedCount: selectedFilenames.length,
    submitted: true,
    notification,
  };
});
