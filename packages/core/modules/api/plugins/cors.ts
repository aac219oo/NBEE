import { Elysia } from "elysia";

/**
 * Shared CORS plugin for Elysia applications.
 *
 * Uses the "pre-handle" pattern (onBeforeHandle) to set CORS headers.
 * This approach avoids Response.clone() issues in Next.js App Router,
 * where the Response body may be locked/streamed.
 */
export const corsPlugin = new Elysia({ name: "cors-plugin" }).onBeforeHandle(
  { as: "global" },
  ({ request, set, headers }) => {
    const origin = (headers.origin as string | undefined) ?? "*";
    set.headers["Access-Control-Allow-Origin"] = origin;
    set.headers["Access-Control-Allow-Credentials"] = "true";
    set.headers["Access-Control-Allow-Headers"] =
      "authorization, content-type, x-requested-with, x-api-key";
    set.headers["Access-Control-Allow-Methods"] =
      "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      set.status = 204 as const;
      return new Response(null, { status: 204, headers: set.headers as any });
    }
  },
);
