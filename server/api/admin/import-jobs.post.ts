import { createError, defineEventHandler, readBody, setHeader } from "h3";
import { normalizeAccessCode, isValidAccessCodeInput } from "../../utils/access-code";
import { assertRateLimit } from "../../utils/rate-limit";
import { createSupabaseAdmin } from "../../utils/supabase";
import { assertAdminJsonRequest, matchesVendorPassword, getVendorPassword } from "../../utils/vendor-session";

type ImportJobResult = {
  created: boolean;
  jobId: string;
  project: { id: string; title: string };
};

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  assertAdminJsonRequest(event);
  assertRateLimit(event, "admin-import-job");
  const body = await readBody<{ accessCode?: unknown; vendorPassword?: unknown }>(event);
  if (typeof body?.accessCode !== "string" || !isValidAccessCodeInput(normalizeAccessCode(body.accessCode))) {
    throw createError({ statusCode: 400, statusMessage: "Enter a valid project access code." });
  }
  const supabase = createSupabaseAdmin(event);
  const { data: projectId, error: accessError } = await supabase.rpc("verify_project_import_access", {
    input_code: normalizeAccessCode(body.accessCode),
  });
  if (accessError) throw createError({ statusCode: 500, statusMessage: "Could not verify the project access code." });
  if (typeof projectId !== "string" || !projectId) {
    throw createError({ statusCode: 401, statusMessage: "Invalid project access code or vendor password." });
  }
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("vendor").eq("id", projectId).single<{ vendor: string | null }>();
  if (projectError || !project) throw createError({ statusCode: 500, statusMessage: "Could not load the project." });
  if (!matchesVendorPassword(body.vendorPassword, getVendorPassword(event, project.vendor))) {
    throw createError({ statusCode: 401, statusMessage: "Invalid project access code or vendor password." });
  }
  const { data, error } = await supabase.rpc("create_vendor_import_job", {
    input_project_id: projectId,
    input_vendor: project.vendor,
  });
  if (error || !data) {
    throw createError({
      statusCode: error?.code === "P0001" ? 409 : 500,
      statusMessage: error?.code === "PGRST202"
        ? "Run the vendor import job setup SQL before importing."
        : error?.code === "P0001"
          ? "The project is no longer eligible for import. Check its vendor, status, and Drive folder."
          : "Could not create the import job. Please try again.",
    });
  }
  return data as ImportJobResult;
});
