import { defineEventHandler, setHeader } from "h3";
import { assertRateLimit } from "../../../utils/rate-limit";
import { assertAdminJsonRequest, useVendorSession } from "../../../utils/vendor-session";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  assertAdminJsonRequest(event);
  assertRateLimit(event, "admin-vendor-logout");
  const session = await useVendorSession(event);
  await session.clear();
  return { cleared: true };
});
