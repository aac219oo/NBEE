"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import type {
  TMenu,
  TPermission,
  TRole,
  TRoleInsert,
  TRoleUpdate,
} from "@heiso/core/lib/db/schema";
import { roles } from "@heiso/core/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Role = TRole & {
  menus: {
    menus: TMenu;
  }[];
  permissions: {
    permission: TPermission;
  }[];
};

async function getRoles(): Promise<Role[]> {
  const db = await getDynamicDb();
  const result = await db.query.roles.findMany({
    with: {
      menus: {
        with: {
          menus: true,
        },
      },
      permissions: {
        with: {
          permission: true,
        },
      },
    },
    where: (t, { isNull }) => isNull(t.deletedAt),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  return result;
}

async function createRole(data: TRoleInsert) {
  const db = await getDynamicDb();
  const result = await db.insert(roles).values(data);
  revalidatePath("/account/role", "page");
  return result;
}

async function updateRole(id: string, data: TRoleUpdate) {
  const db = await getDynamicDb();
  const result = await db
    .update(roles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(roles.id, id));

  revalidatePath("/account/role", "page");
  return result;
}

async function deleteRole({ id }: { id: string }) {
  const db = await getDynamicDb();
  const result = await db
    .update(roles)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)));

  revalidatePath("/account/role", "page");
  return result;
}

export { getRoles, createRole, updateRole, deleteRole };
