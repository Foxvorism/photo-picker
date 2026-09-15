import { createError, defineEventHandler, readBody, setHeader } from "h3";
import { projectVendors } from "../../../../shared/utils/vendors";
import { assertRateLimit } from "../../../utils/rate-limit";
import { assertAdminJsonRequest, getVendorPassword, matchesVendorPassword, useVendorSession } from "../../../utils/vendor-session";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  assertAdminJsonRequest(event);
  assertRateLimit(event, "admin-vendor-verify");
  const session = await useVendorSession(event);
  await session.clear();
  const body = await readBody<{ vendor?: unknown; password?: unknown }>(event);
  const vendor = projectVendors.find((item) => item.id === body?.vendor);
  const expected = getVendorPassword(event, vendor?.id);
  if (!vendor || !matchesVendorPassword(body?.password, String(expected || ""))) {
    throw createError({ statusCode: 401, statusMessage: "Invalid vendor or password." });
  }
  await session.update({ vendor: vendor.id });
  return vendor;
});
