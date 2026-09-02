import { createError, defineEventHandler } from "#imports";
import { getProjectSession } from "../utils/session";
import { createSupabaseAdmin } from "../utils/supabase";
import { rememberPhotoPreviewPath } from "../utils/photo-preview-cache";

type ProjectRow = {
  id: string;
  title: string;
  client_name: string;
  notification_error: string | null;
  notification_status: string | null;
  selection_limit: number;
  status: string;
};

type PhotoRow = {
  id: string;
  filename: string;
  preview_path: string;
  sort_order: number | null;
};

type SelectionRow = {
  photo_id: string;
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
    .select(
      "id,title,client_name,selection_limit,status,notification_status,notification_error",
    )
    .eq("id", projectId)
    .single<ProjectRow>();

  if (projectError || !project) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project was not found",
    });
  }

  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("id,filename,preview_path,sort_order")
    .eq("project_id", projectId)
    .eq("is_visible", true)
    .order("filename", { ascending: false })
    .returns<PhotoRow[]>();

  if (photosError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Photos could not be loaded",
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
      statusMessage: "Selections could not be loaded",
    });
  }

  photos.sort((firstPhoto, secondPhoto) =>
    filenameSorter.compare(firstPhoto.filename, secondPhoto.filename),
  );

  const selectedPhotoIds = new Set(selections.map((selection) => selection.photo_id));

  for (const photo of photos) {
    rememberPhotoPreviewPath(projectId, photo.id, photo.preview_path);
  }

  return {
    project: {
      title: project.title,
      clientName: project.client_name,
      notificationError: project.notification_error,
      notificationStatus: project.notification_status,
      selectionLimit: project.selection_limit,
      status: project.status,
    },
    photos: photos.map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      previewUrl: `/api/photo-previews/${encodeURIComponent(photo.id)}`,
      selected: selectedPhotoIds.has(photo.id),
    })),
    selectedCount: selectedPhotoIds.size,
  };
});
