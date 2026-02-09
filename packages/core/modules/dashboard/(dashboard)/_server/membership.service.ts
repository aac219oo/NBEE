"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import type { TPermission } from "@heiso/core/lib/db/schema";
import { roleMenus } from "@heiso/core/lib/db/schema";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { eq, sql } from "drizzle-orm";
import { getTenantId } from "@heiso/core/lib/utils/tenant";

// Types
type AccessParams = {
  fullAccess: boolean;
  roleId?: string | null;
};

// Error messages
const UNAUTHORIZED_ERROR = "Unauthorized";

async function getUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error(UNAUTHORIZED_ERROR);

  const db = await getDynamicDb();
  const user = await db.query.users.findFirst({
    columns: { id: true, mustChangePassword: true },
    where: (t, { eq }) => eq(t.id, userId),
  });

  return user;
}

async function getMyMembership() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error(UNAUTHORIZED_ERROR);

  const tenantId = await getTenantId();
  console.log("[DEBUG] getMyMembership userId:", userId, "tenantId:", tenantId);

  if (!tenantId) return { isDeveloper: false };

  const db = await getDynamicDb();

  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

    const [user, membership] = await Promise.all([
      tx.query.users.findFirst({
        columns: { id: true },
        with: { developer: true },
        where: (t, { eq }) => eq(t.id, userId),
      }),
      tx.query.members.findFirst({
        columns: {
          id: true,
          roleId: true,
          isOwner: true,
          status: true,
          tenantId: true
        },
        with: {
          role: {
            columns: {
              id: true,
              fullAccess: true,
            },
          },
        },
        where: (t, { and, eq, isNull }) =>
          and(eq(t.userId, userId), isNull(t.deletedAt), eq(t.tenantId, tenantId)), // Explicit tenant filter + RLS
      }),
    ]);

    console.log("[DEBUG] getMyMembership found:", membership?.id, "roleId:", membership?.roleId);

    return {
      isDeveloper: user?.developer !== null,
      ...membership,
    };
  });
}

/**
 * Returns allowed menu IDs for the current user.
 * - If fullAccess is true, returns null (indicating all menus are allowed)
 * - Otherwise, returns an array of menu IDs from role_menus table
 *
 * Note: The actual menu definitions are now in dashboard-config.ts (static config).
 * This function only handles permission filtering.
 */
async function getMyAllowedMenuIds({
  fullAccess,
  roleId,
}: AccessParams): Promise<string[] | null> {
  // Full access means all menus are allowed
  if (fullAccess) {
    console.log("[DEBUG] getMyAllowedMenuIds: fullAccess granted");
    return null;
  }

  if (!roleId) {
    console.log("[DEBUG] getMyAllowedMenuIds: no roleId, returning empty");
    return [];
  }

  const tenantId = await getTenantId();
  console.log("[DEBUG] getMyAllowedMenuIds tenantId:", tenantId, "roleId:", roleId);

  if (!tenantId) return [];

  const db = await getDynamicDb();

  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

    // Query role_menus to get allowed menu IDs
    const roleMenusData = await tx
      .select({
        menuId: roleMenus.menuId,
      })
      .from(roleMenus)
      .where(eq(roleMenus.roleId, roleId));

    const menuIds = roleMenusData.map((item) => item.menuId);
    console.log("[DEBUG] getMyAllowedMenuIds found:", menuIds);
    return menuIds;
  });
}

async function getMyOrgPermissions({
  fullAccess,
  roleId,
}: AccessParams): Promise<Pick<TPermission, "resource" | "action">[]> {
  if (!roleId) return [];

  const db = await getDynamicDb();

  if (fullAccess) {
    return db.query.permissions.findMany({
      columns: {
        resource: true,
        action: true,
      },
      where: (t, { and, isNull }) => and(isNull(t.deletedAt)),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
  }

  const rolePermissionsResult = await db.query.rolePermissions.findMany({
    with: {
      permission: {
        columns: {
          resource: true,
          action: true,
        },
      },
    },
    where: (t, { eq }) => eq(t.roleId, roleId),
  });

  return rolePermissionsResult.map((item) => item.permission).filter(Boolean);
}

export { getUser, getMyMembership, getMyAllowedMenuIds, getMyOrgPermissions };
