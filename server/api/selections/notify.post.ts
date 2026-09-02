import { createError, defineEventHandler } from "#imports";
import { notifyPhotographerSelection } from "../../utils/selection-notification";
import { getProjectSession } from "../../utils/session";
import { createSupabaseAdmin } from "../../utils/supabase";

type ProjectRow = {
  client_name: string;
  id: string;
  photographer_name: string | null;
  photographer_phone: string | null;
  status: string;
  title: string;
};

type SelectionRow = {
  photo_id: string;
};

type PhotoRow = {
  filename: string;
};

const filenameSorter = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export default defineEventHandler(async (event) => {
  const { projectId } = getProjectSession(event);
  const supabase = createSupabaseAdmin(event);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,title,client_name,photographer_name,photographer_phone,status")
    .eq("id", projectId)
    .single<ProjectRow>();

  if (projectError || !project) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project tidak ditemukan.",
    });
  }

  if (project.status !== "submitted") {
    throw createError({
      statusCode: 409,
      statusMessage: "Project belum difinalisasi.",
    });
  }

  const { data: selections, error: selectionsError } = await supabase
    .from("selections")
    .select("photo_id")
    .eq("project_id", projectId)
    .returns<SelectionRow[]>();

  if (selectionsError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Pilihan foto tidak bisa dimuat.",
    });
  }

  if (selections.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Belum ada foto yang dipilih.",
    });
  }

  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("filename")
    .eq("project_id", projectId)
    .in(
      "id",
      selections.map((selection) => selection.photo_id),
    )
    .returns<PhotoRow[]>();

  if (photosError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Daftar filename tidak bisa dimuat.",
    });
  }

  const selectedFilenames = photos
    .map((photo) => photo.filename)
    .sort((firstFilename, secondFilename) =>
      filenameSorter.compare(firstFilename, secondFilename),
    );
  const notification = await notifyPhotographerSelection(
    event,
    supabase,
    project,
    selectedFilenames,
  );

  return {
    notification,
    selectedCount: selectedFilenames.length,
  };
});
