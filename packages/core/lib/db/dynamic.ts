import { db, getDbClient } from "./index";
import { headers } from "next/headers";
import { type TenantTier } from "../../types/tenant";

/**
 * Retrieves the correct Database Client (Transaction or Pool)
 * based on the request context (Headers).
 *
 * Supports:
 * - Shared DB (Basic/Premium)
 * - Isolated DB (Enterprise/Custom) via x-tenant-db-url
 *
 * Accepts an optional custom schema for extending apps (e.g. CMS).
 */
export async function getDynamicDb<
  TS extends Record<string, unknown> = typeof import("./schema"),
>(customSchema?: TS) {
  // Skip DB connection during build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    throw new Error("[getDynamicDb] Skipped during build phase");
  }

  try {
    const h = await headers();
    const tier = h.get("x-tenant-tier") as TenantTier | null;
    const dbUrl = h.get("x-tenant-db-url");

    return getDbClient(tier ?? undefined, dbUrl, customSchema);
  } catch (e) {
    // Falls back to default DB if headers() is not available (e.g. script context)
    // or if headers() throws.
  }

  if (customSchema) {
    return getDbClient(undefined, undefined, customSchema);
  }
  return db as unknown as ReturnType<typeof getDbClient<TS>>;
}
