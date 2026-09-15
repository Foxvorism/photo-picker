import { createHash, timingSafeEqual } from "node:crypto";
import { createError, getHeader, useSession, type H3Event } from "h3";
import { useRuntimeConfig } from "#imports";

export function getVendorPassword(event: H3Event, vendor: unknown) {
  const config = useRuntimeConfig(event);
  return String((vendor === "Sutoori Production" ? config.sutooriSecretKey : vendor === "Sinemayu" ? config.sinemayuSecretKey : "") || "");
}

export function matchesVendorPassword(input: unknown, expected: string) {
  if (typeof input !== "string" || !expected || input.length > 1024) return false;
  return timingSafeEqual(
    createHash("sha256").update(input).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

export function assertAdminJsonRequest(event: H3Event) {
  // JSON-only requests cannot be submitted by a cross-origin HTML form.
  if (getHeader(event, "content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json" || getHeader(event, "sec-fetch-site") === "cross-site") {
    throw createError({ statusCode: 403, statusMessage: "This request is not allowed." });
  }
}

export function useVendorSession(event: H3Event) {
  const secret = String(useRuntimeConfig(event).sessionSecret || "");
  if (secret.length < 32) {
    throw createError({ statusCode: 500, statusMessage: "The session secret must be configured with at least 32 characters." });
  }
  return useSession<{ vendor?: string }>(event, {
    name: "photo_picker_vendor",
    password: secret,
    maxAge: 60 * 30,
    sessionHeader: false,
    cookie: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/api/admin" },
  });
}
