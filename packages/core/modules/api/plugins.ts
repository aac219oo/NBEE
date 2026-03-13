import { Elysia } from "elysia";

/**
 * CORS plugin for Elysia
 * Manually handles CORS to avoid Response.clone errors in Next.js
 */
export const corsPlugin = new Elysia({ name: "cors" }).onBeforeHandle(
  ({ request, set, headers }) => {
    const origin = (headers.origin as string | undefined) ?? "*";
    set.headers["Access-Control-Allow-Origin"] = origin;
    set.headers["Access-Control-Allow-Credentials"] = "true";
    set.headers["Access-Control-Allow-Headers"] =
      "authorization, content-type, x-requested-with, x-api-key";
    set.headers["Access-Control-Allow-Methods"] =
      "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";

    // Preflight requests
    if (request.method === "OPTIONS") {
      set.status = 204 as const;
      return new Response(null, { status: 204, headers: set.headers as any });
    }
  }
);
