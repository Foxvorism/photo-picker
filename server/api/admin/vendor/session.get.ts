import { defineEventHandler, getCookie, setHeader } from "h3";
import { projectVendors } from "../../../../shared/utils/vendors";
import { useVendorSession } from "../../../utils/vendor-session";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  if (!getCookie(event, "photo_picker_vendor")) return { vendor: null };
  const session = await useVendorSession(event);
  return { vendor: projectVendors.find((item) => item.id === session.data.vendor) ?? null };
});
