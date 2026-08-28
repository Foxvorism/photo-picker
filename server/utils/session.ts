import type { H3Event } from "h3";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createError, getCookie, setCookie, useRuntimeConfig } from "#imports";

const sessionCookieName = "photo_picker_session";
const sessionMaxAgeSeconds = 60 * 60 * 24;

type ProjectSession = {
  projectId: string;
  expiresAt: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function requireSessionSecret(event: H3Event) {
  const config = useRuntimeConfig(event);

  if (!config.sessionSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Session server configuration is missing",
    });
  }

  return config.sessionSecret;
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function setProjectSession(event: H3Event, projectId: string) {
  if (!isValidUuid(projectId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project ID is invalid",
    });
  }

  const secret = requireSessionSecret(event);
  const session: ProjectSession = {
    projectId,
    expiresAt: Date.now() + sessionMaxAgeSeconds * 1000,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = signPayload(payload, secret);

  setCookie(event, sessionCookieName, `${payload}.${signature}`, {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function getProjectSession(event: H3Event) {
  const secret = requireSessionSecret(event);
  const cookie = getCookie(event, sessionCookieName);

  if (!cookie) {
    throw createError({
      statusCode: 401,
      statusMessage: "Session is required",
    });
  }

  const [payload, signature] = cookie.split(".");

  if (!payload || !signature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Session is invalid",
    });
  }

  const expectedSignature = signPayload(payload, secret);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Session is invalid",
    });
  }

  const session = JSON.parse(base64UrlDecode(payload)) as ProjectSession;

  if (!isValidUuid(session.projectId) || Date.now() > session.expiresAt) {
    throw createError({
      statusCode: 401,
      statusMessage: "Session is expired",
    });
  }

  return session;
}
