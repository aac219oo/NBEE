"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";

const isCoreMode = () => process.env.APP_MODE === "core";

interface UserPermission {
  role: string;
  fullAccess: boolean;
  permissions?: {
    id: string;
    resource: string;
    action: string;
  }[];
}

async function findUserPermissions(userId: string): Promise<UserPermission> {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：使用本地 accounts 表
    const account = await db.query.accounts.findFirst({
      columns: {
        id: true,
        role: true,
        roleId: true,
      },
      with: {
        customRole: {
          columns: {
            id: true,
            name: true,
            fullAccess: true,
          },
          with: {
            permissions: {
              with: {
                permission: {
                  columns: {
                    id: true,
                    resource: true,
                    action: true,
                  },
                },
              },
            },
          },
        },
      },
      where: (t, { eq, isNull, and }) =>
        and(eq(t.id, userId), isNull(t.deletedAt)),
    });

    if (!account) throw new Error("User not found");

    const isOwner = account.role === "owner";
    const roleName = isOwner ? "owner" : (account.customRole?.name ?? account.role ?? "");
    const fullAccess = isOwner || account.customRole?.fullAccess === true;

    return {
      role: roleName,
      fullAccess,
      permissions: account.customRole?.permissions?.map((e: any) => e.permission) ?? [],
    };
  }

  // APPS 模式：使用 FDW foreignAccounts 和 members 表
  // @ts-ignore - Drizzle relational query mapping issues due to version mismatch
  const user = await db.query.foreignAccounts.findFirst({
    where: (t, { eq }) => eq(t.id, userId),
  });

  if (!user) throw new Error("User not found");

  const isDeveloperFlag = false; // Simplified
  const membership = await db.query.members.findFirst({
    columns: {
      id: true,
      role: true,
    },
    with: {
      role: {
        columns: {
          id: true,
          name: true,
          fullAccess: true,
        },
        with: {
          permissions: {
            with: {
              permission: {
                columns: {
                  id: true,
                  resource: true,
                  action: true,
                },
              },
            },
          },
        },
      },
    },
    where: (t, { eq, and, isNull }) =>
      and(eq(t.accountId, userId), isNull(t.deletedAt)),
  });

  // membership.role 是 'owner' | 'admin' | 'member' 欄位
  // membership.role (relation) 與欄位同名，需透過 roleId 關聯取得
  let roleName = "";
  if (isDeveloperFlag) {
    roleName = "develop";
  } else if (membership?.role === 'owner') {
    roleName = "owner";
  } else {
    // @ts-ignore - role relation vs role column naming conflict
    roleName = membership?.role?.name ?? membership?.role ?? "";
  }

  const fullAccess =
    isDeveloperFlag ||
    membership?.role === 'owner' ||
    // @ts-ignore - role relation
    membership?.role?.fullAccess === true;

  return {
    role: roleName,
    fullAccess,
    // @ts-ignore - role relation
    permissions: membership?.role?.permissions?.map((e) => e.permission) ?? [],
  };
}

export { findUserPermissions, type UserPermission };
