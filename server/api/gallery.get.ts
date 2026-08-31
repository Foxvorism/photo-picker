import { createError, defineEventHandler, useRuntimeConfig } from "#imports";
import { getProjectSession } from "../utils/session";
import { createSupabaseAdmin } from "../utils/supabase";

type ProjectRow = {
  id: string;
  title: string;
  client_name: string;
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
  const config = useRuntimeConfig(event);
  const supabase = createSupabaseAdmin(event);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,title,client_name,selection_limit,status")
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

  if (photos.length === 0) {
    return {
      project: {
        title: project.title,
        clientName: project.client_name,
        selectionLimit: project.selection_limit,
        status: project.status,
      },
      photos: [],
      selectedCount: selections.length,
    };
  }

  const signedUrls = await supabase.storage
    .from(config.supabaseBucket)
    .createSignedUrls(photos.map((photo) => photo.preview_path), 60 * 5);

  if (signedUrls.error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Photo previews could not be loaded",
    });
  }

  const selectedPhotoIds = new Set(selections.map((selection) => selection.photo_id));

  return {
    project: {
      title: project.title,
      clientName: project.client_name,
      selectionLimit: project.selection_limit,
      status: project.status,
    },
    photos: photos.map((photo, index) => ({
      id: photo.id,
      filename: photo.filename,
      previewUrl: signedUrls.data[index]?.signedUrl ?? "",
      selected: selectedPhotoIds.has(photo.id),
    })),
    selectedCount: selectedPhotoIds.size,
  };
});
