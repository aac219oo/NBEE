"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import type { TPublicApiKey } from "@heiso/core/lib/db/schema";
import { apiKeys } from "@heiso/core/lib/db/schema";
import { generateApiKey, hashApiKey } from "@heiso/core/lib/hash";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTenantId } from "@heiso/core/lib/utils/tenant";
import { ensureTenantContext } from "@heiso/core/lib/db/rls";

// Generate masked display key from raw key (e.g. sk_a1b2...f6e5)
function truncateKey(rawKey: string): string {
  if (rawKey.length <= 12) return rawKey;
  return `${rawKey.substring(0, 7)}...${rawKey.substring(rawKey.length - 4)}`;
}

type TApiKeyWithKeyPrefix = TPublicApiKey & { keyPrefix: string };

// Get API Keys list
export async function getApiKeysList(
  options: { search?: string; start?: number; limit?: number } = {},
) {
  await ensureTenantContext();
  const db = await getDynamicDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { apiKeys: [], total: 0 };
  }

  const tenantId = await getTenantId();

  const { search, start = 0, limit = 10 } = options;

  try {
    // Build where conditions
    const whereConditions = [
      eq(apiKeys.userId, session.user.id),
      isNull(apiKeys.deletedAt),
    ];

    if (tenantId) {
      whereConditions.push(eq(apiKeys.tenantId, tenantId));
    }

    if (search) {
      whereConditions.push(
        // Add search condition for name
        // Note: This is a simplified search, you might want to use ilike for case-insensitive search
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(apiKeys)
      .where(and(...whereConditions));

    // Get paginated results
    const results = await db
      .select({
        id: apiKeys.id,
        tenantId: apiKeys.tenantId,
        name: apiKeys.name,
        userId: apiKeys.userId,
        truncatedKey: apiKeys.truncatedKey,
        rateLimit: apiKeys.rateLimit,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(and(...whereConditions))
      .orderBy(desc(apiKeys.createdAt))
      .limit(limit)
      .offset(start);

    // Transform results to use truncated key for display
    const transformedResults: TApiKeyWithKeyPrefix[] = results.map(
      (result) => ({
        ...result,
        keyPrefix: result.truncatedKey || '???',
      }),
    );

    return {
      apiKeys: transformedResults,
      total: totalResult.count,
    };
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return { apiKeys: [], total: 0 };
  }
}

// Get single API key
export async function getApiKey(
  id: string,
): Promise<TApiKeyWithKeyPrefix | null> {
  await ensureTenantContext();
  const db = await getDynamicDb();
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const tenantId = await getTenantId();

  try {
    const filters = [
      eq(apiKeys.id, id),
      eq(apiKeys.userId, session.user.id),
      isNull(apiKeys.deletedAt),
    ];
    if (tenantId) filters.push(eq(apiKeys.tenantId, tenantId));

    const result = await db
      .select({
        id: apiKeys.id,
        tenantId: apiKeys.tenantId,
        name: apiKeys.name,
        userId: apiKeys.userId,
        truncatedKey: apiKeys.truncatedKey,
        rateLimit: apiKeys.rateLimit,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(and(...filters))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const apiKey = result[0];
    return {
      ...apiKey,
      keyPrefix: apiKey.truncatedKey || '???',
    };
  } catch (error) {
    console.error("Error fetching API key:", error);
    return null;
  }
}

// Create new API key
type RateLimit = { requests: number; window: number };
type CreateApiKeyInput = {
  name: string;
  description: string | null;
  expiresAt: Date | null;
  isActive?: boolean;
  rateLimit?: RateLimit;
};
type UpdateApiKeyInput = {
  name?: string;
  description?: string | null;
  expiresAt?: Date | null;
  isActive?: boolean;
  rateLimit?: RateLimit;
};

export async function createApiKey(data: CreateApiKeyInput): Promise<{
  success: boolean;
  apiKey?: TApiKeyWithKeyPrefix & { key: string };
  error?: string;
}> {
  await ensureTenantContext();
  const db = await getDynamicDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Tenant context missing" };

  try {
    // Generate new API key
    const newKey = generateApiKey();
    const hashedKey = await hashApiKey(newKey);
    const keyPrefix = truncateKey(newKey);

    const [result] = await db
      .insert(apiKeys)
      .values({
        userId: session.user.id,
        tenantId,
        name: data.name,
        key: hashedKey,
        truncatedKey: keyPrefix,
        rateLimit: data.rateLimit,
        expiresAt: data.expiresAt,
      })
      .returning({
        id: apiKeys.id,
        tenantId: apiKeys.tenantId,
        name: apiKeys.name,
        userId: apiKeys.userId,
        rateLimit: apiKeys.rateLimit,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      });

    revalidatePath("/dashboard/settings/api-keys", "page");

    return {
      success: true,
      apiKey: {
        ...result,
        truncatedKey: keyPrefix,
        keyPrefix,
        key: newKey, // Return the actual key only on creation
      },
    };
  } catch (error) {
    console.error("Error creating API key:", error);
    return { success: false, error: "Failed to create API key" };
  }
}

// Update API key
export async function updateApiKey(
  id: string,
  data: UpdateApiKeyInput,
): Promise<{ success: boolean; data?: TApiKeyWithKeyPrefix; error?: string }> {
  await ensureTenantContext();
  const db = await getDynamicDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const tenantId = await getTenantId();

  try {
    const filters = [
      eq(apiKeys.id, id),
      eq(apiKeys.userId, session.user.id),
      isNull(apiKeys.deletedAt),
    ];
    if (tenantId) filters.push(eq(apiKeys.tenantId, tenantId));

    const result = await db
      .update(apiKeys)
      .set({
        name: data.name,
        expiresAt: data.expiresAt,
        rateLimit: data.rateLimit,
        updatedAt: new Date(),
      })
      .where(and(...filters))
      .returning({
        id: apiKeys.id,
        tenantId: apiKeys.tenantId,
        name: apiKeys.name,
        userId: apiKeys.userId,
        truncatedKey: apiKeys.truncatedKey,
        rateLimit: apiKeys.rateLimit,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      });

    if (result.length === 0) {
      return { success: false, error: "API key not found" };
    }

    const updatedApiKey: TApiKeyWithKeyPrefix = {
      ...result[0],
      keyPrefix: result[0].truncatedKey || '???',
    };

    revalidatePath("/dashboard/settings/api-keys", "page");
    return { success: true, data: updatedApiKey };
  } catch (error) {
    console.error("Error updating API key:", error);
    return { success: false, error: "Failed to update API key" };
  }
}

// Delete API key (soft delete)
export async function deleteApiKey(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await ensureTenantContext();
  const db = await getDynamicDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const tenantId = await getTenantId();

  try {
    const filters = [
      eq(apiKeys.id, id),
      eq(apiKeys.userId, session.user.id),
      isNull(apiKeys.deletedAt),
    ];
    if (tenantId) filters.push(eq(apiKeys.tenantId, tenantId));

    const result = await db
      .update(apiKeys)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(...filters))
      .returning({ id: apiKeys.id });

    if (result.length === 0) {
      return { success: false, error: "API key not found" };
    }

    revalidatePath("/dashboard/settings/api-keys", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting API key:", error);
    return { success: false, error: "Failed to delete API key" };
  }
}

// Verify API key (for authentication middleware)
export async function verifyApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  apiKeyId?: string;
}> {
  await ensureTenantContext();
  const db = await getDynamicDb();
  if (!key) {
    return { valid: false };
  }

  const tenantId = await getTenantId();

  try {
    const hashedKey = await hashApiKey(key);

    const filters = [
      eq(apiKeys.key, hashedKey),
      isNull(apiKeys.deletedAt),
    ];
    if (tenantId) filters.push(eq(apiKeys.tenantId, tenantId));

    const result = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(and(...filters))
      .limit(1);

    if (result.length === 0) {
      return { valid: false };
    }

    const apiKey = result[0];

    // Check if key is expired
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false };
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    return {
      valid: true,
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
    };
  } catch (error) {
    console.error("Error verifying API key:", error);
    return { valid: false };
  }
}
