import { headers } from "next/headers";

// Fallback ID for standalone dev mode
export const APP_MODE = "core";

/**
 * Retrieves the current tenant ID from the request headers.
 */
export async function getTenantId(): Promise<string | undefined> {
    const h = await headers();
    const tenantId = h.get("x-tenant-id");

    if (!tenantId && process.env.APP_MODE === APP_MODE) {
        return APP_MODE;
    }

    return tenantId || undefined;
}