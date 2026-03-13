"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import type { TPermission } from "@heiso/core/lib/db/schema";
import { roleMenus, foreignAccounts, accounts } from "@heiso/core/lib/db/schema";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { eq, and, isNull } from "drizzle-orm";

const isCoreMode = () => process.env.APP_MODE === "core";

// Types
type AccessParams = {
  fullAccess: boolean;
  roleId?: string | null;
};

// Error messages
const UNAUTHORIZED_ERROR = "Unauthorized";

/**
 * 取得當前帳號資訊
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 FDW foreignAccounts
 */
async function getAccount() {
  const session = await auth();
  const accountId = session?.user?.id;
  if (!accountId) throw new Error(UNAUTHORIZED_ERROR);

  const db = await getDynamicDb();

  if (isCoreMode()) {
    const account = await db.query.accounts.findFirst({
      columns: {
        id: true,
        email: true,
        name: true,
      },
      where: (t, { eq, isNull }) =>
        and(eq(t.id, accountId), isNull(t.deletedAt)),
    });
    return account ?? null;
  } else {
    const [account] = await db
      .select({
        id: foreignAccounts.id,
        email: foreignAccounts.email,
        name: foreignAccounts.name,
      })
      .from(foreignAccounts)
      .where(eq(foreignAccounts.id, accountId))
      .limit(1);

    return account ?? null;
  }
}

/**
 * 取得當前帳號的成員資格
 * Core 模式：使用 accounts 表
 * APPS 模式：使用 members 表
 */
async function getMyMembership() {
  const session = await auth();
  const accountId = session?.user?.id;
  if (!accountId) throw new Error(UNAUTHORIZED_ERROR);

  const db = await getDynamicDb();
  const isDeveloper = session?.user?.isDeveloper ?? false;

  if (isCoreMode()) {
    const account = await db.query.accounts.findFirst({
      columns: {
        id: true,
        roleId: true,
        role: true,
        status: true,
      },
      with: {
        customRole: {
          columns: {
            id: true,
            fullAccess: true,
          },
        },
      },
      where: (t, { eq, isNull }) =>
        and(eq(t.id, accountId), isNull(t.deletedAt)),
    });

    return {
      isDeveloper,
      id: account?.id,
      accountId: account?.id,
      roleId: account?.roleId,
      role: account?.role,
      status: account?.status,
      customRole: account?.customRole,
    };
  } else {
    const membership = await db.query.members.findFirst({
      columns: {
        id: true,
        roleId: true,
        role: true,
        status: true,
        accountId: true,
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
        and(eq(t.accountId, accountId), isNull(t.deletedAt)),
    });

    return {
      isDeveloper,
      ...membership,
    };
  }
}

/**
 * Returns allowed menu IDs for the current user.
 * - If fullAccess is true, returns null (indicating all menus are allowed)
 * - Otherwise, returns an array of menu IDs from role_menus table
 */
async function getMyAllowedMenuIds({
  fullAccess,
  roleId,
}: AccessParams): Promise<string[] | null> {
  // Full access means all menus are allowed
  if (fullAccess) {
    return null;
  }

  if (!roleId) {
    return [];
  }

  const db = await getDynamicDb();

  // Query role_menus to get allowed menu IDs
  const roleMenusData = await db
    .select({
      menuId: roleMenus.menuId,
    })
    .from(roleMenus)
    .where(eq(roleMenus.roleId, roleId));

  const menuIds = roleMenusData.map((item) => item.menuId);
  return menuIds;
}

/**
 * 取得組織權限
 */
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
      where: (t, { isNull }) => isNull(t.deletedAt),
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

const getUser = getAccount;

export { getAccount, getUser, getMyMembership, getMyAllowedMenuIds, getMyOrgPermissions };
