import { defineEventHandler } from "#imports";
import { clearProjectSession } from "../../utils/session";

export default defineEventHandler((event) => {
  clearProjectSession(event);

  return {
    success: true,
  };
});
