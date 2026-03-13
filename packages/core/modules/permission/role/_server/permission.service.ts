"use server";

import { permissionsConfig, type PermissionConfigShape } from "@heiso/core/config/permissions";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import {
  permissions,
  type TMenu,
  type TPermission,
} from "@heiso/core/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getPermissions() {
  // 合併 config 中的 permissions 與 db 中的 permissions
  const map = new Map();
  const configPermissions = (permissionsConfig as readonly PermissionConfigShape[]).map((p) => {
    return {
      id: p.id,
      resource: p.resource,
      action: p.action,
      menuId: p.menu?.id ?? null,
    };
  });

  for (const p of configPermissions) {
    map.set(p.id, p);
  }

  const db = await getDynamicDb();
  const result = await db.query.permissions.findMany({
    where: (t, { isNull }) => isNull(t.deletedAt),
  });

  for (const p of result) {
    map.set(p.id, p);
  }

  const uniquePermissions = Array.from(map.values());
  return uniquePermissions;
}

async function groupPermissionsByMenu<T extends TMenu, P extends TPermission>(
  menus: Pick<T, "id" | "title">[],
  permissions: P[],
) {
  return menus.map((menu) => {
    const menuPermissions = permissions.filter((permission) => {
      return permission.menuId === menu.id;
    });

    return {
      id: menu.id,
      title: menu.title,
      permissions: menuPermissions.map((p) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
      })),
    };
  });
}

async function createPermission({
  menuId,
  resource,
  action,
}: {
  space: "Organization" | "Project";
  menuId?: string;
  resource: string;
  action: string;
}) {
  const db = await getDynamicDb();
  const result = await db.insert(permissions).values({
    menuId,
    resource,
    action,
  });

  revalidatePath("/account/role", "page");
  return result;
}

async function updatePermission({
  id,
  resource,
  action,
}: {
  id: string;
  resource: string;
  action: string;
}) {
  const db = await getDynamicDb();
  const result = await db
    .update(permissions)
    .set({
      resource,
      action,
      updatedAt: new Date(),
    })
    .where(eq(permissions.id, id));

  revalidatePath("/account/role", "page");
  return result;
}

async function deletePermission({ id }: { id: string }) {
  const db = await getDynamicDb();
  const result = await db
    .update(permissions)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(permissions.id, id), isNull(permissions.deletedAt)));

  revalidatePath("/account/role", "page");
  return result;
}

export {
  getPermissions,
  groupPermissionsByMenu,
  createPermission,
  updatePermission,
  deletePermission,
};
