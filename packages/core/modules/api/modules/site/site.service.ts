import { getDynamicDb } from "@heiso/core/lib/db/dynamic";

export async function getSiteSetting() {
  const db = await getDynamicDb();
  const settings = await db.query.settings.findMany({
    where: (fields, { and, eq, isNull }) => and(
      isNull(fields.deletedAt),
      eq(fields.group, 'site'),
    ),
  });
  const result: Record<string, unknown> = {};
  for (const { name, value } of settings) {
    result[name] = value;
  }
  return result;
}
