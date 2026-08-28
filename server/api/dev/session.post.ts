import { createError, defineEventHandler, readBody } from "#imports";
import { setProjectSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === "production") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found",
    });
  }

  const body = await readBody<{ projectId?: unknown }>(event);

  if (typeof body.projectId !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Project ID is required",
    });
  }

  setProjectSession(event, body.projectId);

  return {
    ok: true,
  };
});
