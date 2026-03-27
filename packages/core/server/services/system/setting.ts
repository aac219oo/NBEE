"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import type { Settings } from "@heiso/core/types/system";

export async function getSystemSettings(
  withoutKey: boolean = false,
): Promise<Settings> {
  const db = await getDynamicDb();
  const rows = await db.query.settings.findMany({
    columns: { name: true, value: true },
    where: (fields, { and, eq, isNull }) =>
      and(
        eq(fields.group, "system"),
        withoutKey ? eq(fields.isKey, false) : undefined,
        isNull(fields.deletedAt),
      ),
  });
  const result: Record<string, unknown> = {};
  for (const { name, value } of rows) {
    result[name] = value;
  }
  return result;
}
