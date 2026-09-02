import type { SupabaseClient } from "@supabase/supabase-js";

type PreviewPathCacheEntry = {
  previewPath: string;
  expiresAt: number;
};

type SignedUrlCacheEntry = {
  signedUrl: string;
  expiresAt: number;
};

const previewPathCache = new Map<string, PreviewPathCacheEntry>();
const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

const previewPathCacheSeconds = 60 * 15;
export const signedUrlSeconds = 60 * 15;
export const browserPhotoCacheSeconds = 60 * 10;
const signedUrlRefreshBufferMs = 60 * 1000;

function createPreviewPathKey(projectId: string, photoId: string) {
  return `${projectId}:${photoId}`;
}

function createSignedUrlKey(bucket: string, previewPath: string) {
  return `${bucket}:${previewPath}`;
}

export function rememberPhotoPreviewPath(
  projectId: string,
  photoId: string,
  previewPath: string,
) {
  previewPathCache.set(createPreviewPathKey(projectId, photoId), {
    previewPath,
    expiresAt: Date.now() + previewPathCacheSeconds * 1000,
  });
}

export function getCachedPhotoPreviewPath(projectId: string, photoId: string) {
  const cacheKey = createPreviewPathKey(projectId, photoId);
  const cached = previewPathCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    previewPathCache.delete(cacheKey);
    return null;
  }

  return cached.previewPath;
}

export async function getCachedSignedPhotoUrl(
  supabase: SupabaseClient,
  bucket: string,
  previewPath: string,
) {
  const cacheKey = createSignedUrlKey(bucket, previewPath);
  const cached = signedUrlCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return {
      signedUrl: cached.signedUrl,
      error: null,
    };
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(previewPath, signedUrlSeconds);

  if (error || !data?.signedUrl) {
    return {
      signedUrl: null,
      error,
    };
  }

  signedUrlCache.set(cacheKey, {
    signedUrl: data.signedUrl,
    expiresAt: Date.now() + signedUrlSeconds * 1000 - signedUrlRefreshBufferMs,
  });

  return {
    signedUrl: data.signedUrl,
    error: null,
  };
}
