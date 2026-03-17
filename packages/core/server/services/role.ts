"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";

interface UserPermission {
  role: string;
  fullAccess: boolean;
  permissions?: {
    id: string;
    resource: string;
    action: string;
  }[];
}

/**
 * 取得使用者權限
 * 統一使用 accounts 表
 */
async function findUserPermissions(userId: string): Promise<UserPermission> {
  const db = await getDynamicDb();

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

export { findUserPermissions, type UserPermission };
