import {
  createError,
  defineEventHandler,
  getRouterParam,
  sendRedirect,
  setHeader,
  useRuntimeConfig,
} from "#imports";
import {
  browserPhotoCacheSeconds,
  getCachedPhotoPreviewPath,
  getCachedSignedPhotoUrl,
  rememberPhotoPreviewPath,
} from "../../utils/photo-preview-cache";
import { getProjectSession } from "../../utils/session";
import { createSupabaseAdmin } from "../../utils/supabase";

type PhotoPreviewRow = {
  preview_path: string;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default defineEventHandler(async (event) => {
  const photoId = getRouterParam(event, "photoId");

  if (!photoId || !isValidUuid(photoId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Photo ID is invalid",
    });
  }

  const { projectId } = getProjectSession(event);
  const config = useRuntimeConfig(event);
  const supabase = createSupabaseAdmin(event);
  let previewPath = getCachedPhotoPreviewPath(projectId, photoId);

  if (!previewPath) {
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("preview_path")
      .eq("id", photoId)
      .eq("project_id", projectId)
      .eq("is_visible", true)
      .single<PhotoPreviewRow>();

    if (photoError || !photo) {
      throw createError({
        statusCode: 404,
        statusMessage: "Photo preview was not found",
      });
    }

    previewPath = photo.preview_path;
    rememberPhotoPreviewPath(projectId, photoId, previewPath);
  }

  const { signedUrl, error } = await getCachedSignedPhotoUrl(
    supabase,
    config.supabaseBucket,
    previewPath,
  );

  if (error || !signedUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Photo preview could not be loaded",
    });
  }

  setHeader(
    event,
    "Cache-Control",
    `private, max-age=${browserPhotoCacheSeconds}`,
  );

  return sendRedirect(event, signedUrl, 302);
});
