"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";

async function getMenus() {
  const db = await getDynamicDb();
  const result = await db.query.menus.findMany({
    where: (t, { isNull }) => isNull(t.deletedAt),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  return result;
}

export { getMenus };
