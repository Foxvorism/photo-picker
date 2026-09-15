import { createError, defineEventHandler, readBody, setHeader } from "h3";
import { projectVendors } from "../../../shared/utils/vendors";
import { assertRateLimit } from "../../utils/rate-limit";
import { assertAdminJsonRequest, useVendorSession } from "../../utils/vendor-session";
import { parseProjectInput } from "../../utils/project-input";
import { createSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  assertAdminJsonRequest(event);
  assertRateLimit(event, "admin-create-project");
  const session = await useVendorSession(event);
  const vendor = projectVendors.find((item) => item.id === session.data.vendor);
  if (!vendor) throw createError({ statusCode: 401, statusMessage: "Please verify the vendor password first." });
  const body = await readBody<unknown>(event);
  if (!body || typeof body !== "object" || !("vendor" in body) || body.vendor !== vendor.id) {
    throw createError({ statusCode: 403, statusMessage: "The vendor does not match the verified session." });
  }
  let project: ReturnType<typeof parseProjectInput>;
  try {
    project = parseProjectInput(body);
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : "Invalid project data." });
  }
  const { data, error } = await createSupabaseAdmin(event).rpc("create_vendor_project", {
    input_project: { ...project, vendor: vendor.id },
  });
  if (error || !data || typeof data.id !== "string" || typeof data.access_code !== "string") {
    const statusMessage = error?.code === "PGRST202"
      ? "The create_vendor_project function is unavailable. Run the project creation setup SQL."
      : error?.code === "23505"
        ? "The access code or project already exists. Please try creating the project again."
        : "Could not create the project. Check the database configuration and schema.";
    throw createError({ statusCode: error?.code === "23505" ? 409 : 500, statusMessage });
  }
  return { id: data.id, title: project.title, accessCode: data.access_code };
});
