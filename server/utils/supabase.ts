import type { H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
import { createError, useRuntimeConfig } from "#imports";

export function createSupabaseAdmin(event: H3Event) {
  const config = useRuntimeConfig(event);

  if (!config.supabaseUrl || !config.supabaseSecretKey || !config.supabaseBucket) {
    throw createError({
      statusCode: 500,
      statusMessage: "Supabase server configuration is missing",
    });
  }

  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
