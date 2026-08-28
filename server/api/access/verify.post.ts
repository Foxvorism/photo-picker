import { createError, defineEventHandler, readBody } from "#imports";
import { normalizeAccessCode, isValidAccessCodeInput } from "../../utils/access-code";
import { assertRateLimit } from "../../utils/rate-limit";
import { setProjectSession } from "../../utils/session";
import { createSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  assertRateLimit(event, "access-verify");

  const body = await readBody<{ code?: unknown }>(event);

  if (typeof body.code !== "string") {
    return {
      valid: false,
    };
  }

  const code = normalizeAccessCode(body.code);

  if (!isValidAccessCodeInput(code)) {
    return {
      valid: false,
    };
  }

  const supabase = createSupabaseAdmin(event);
  const { data: projectId, error } = await supabase.rpc("verify_project_access", {
    input_code: code,
  });

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Kode akses belum bisa diverifikasi",
    });
  }

  if (typeof projectId !== "string" || !projectId) {
    return {
      valid: false,
    };
  }

  setProjectSession(event, projectId);

  return {
    valid: true,
  };
});
