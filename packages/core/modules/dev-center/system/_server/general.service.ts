"use server";

import type { Locale } from "@heiso/core/i18n/config";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { settings } from "@heiso/core/lib/db/schema";
import type { Settings } from "@heiso/core/types/system";

// 讀取 settings（系統級設定，group='general'）
async function getGeneralSettings(): Promise<Settings> {
  const db = await getDynamicDb();
  const result = await db.query.settings.findMany({
    columns: { name: true, value: true },
    where: (fields, { and, eq, isNull }) =>
      and(eq(fields.group, "general"), isNull(fields.deletedAt)),
  });

  const settingsMap: Record<string, unknown> = {};
  for (const { name, value } of result) {
    settingsMap[name] = value;
  }
  return settingsMap;
}

// 寫入 settings（以 name 為 key upsert）
async function saveGeneralSetting(data: Settings) {
  const db = await getDynamicDb();

  // Check for domain update
  const basicSettings = (data as any)?.basic;
  if (basicSettings?.domain !== undefined) {
    try {
      // 取得目前 tenant 的 tenantId (從 settings 中)
      const tenantIdSetting = await db.query.settings.findFirst({
        where: (fields, { eq }) => eq(fields.name, "tenantId"),
      });
      const tenantId = tenantIdSetting?.value as string | undefined;

      if (tenantId) {
        const { getTenantAdapter } = await import("@heiso/core/lib/adapters");
        const tenantAdapter = getTenantAdapter();
        if (tenantAdapter) {
          await tenantAdapter.updateTenant(tenantId, {
            customDomain: basicSettings.domain || null,
          });
        } else {
          console.warn("[saveGeneralSetting] TenantAdapter not registered, skipping remote update");
        }
      }
    } catch (error) {
      console.error("Failed to update tenant custom domain", error);
      throw new Error("Failed to update custom domain");
    }
  }

  await db.transaction(async (tx) => {
    const entries = Object.entries(data ?? {});
    if (entries.length === 0) return;
    await Promise.all(
      entries.map(async ([key, value]) => {
        await tx
          .insert(settings)
          .values({
            name: key,
            value,
            group: "general",
          })
          .onConflictDoUpdate({
            target: settings.name,
            set: {
              value,
              updatedAt: new Date(),
            },
          });
      }),
    );
  });
}

// 快捷：更新系統預設語言到 settings
async function saveDefaultLanguage(locale: Locale) {
  const db = await getDynamicDb();

  await db
    .insert(settings)
    .values({
      name: "language",
      value: { default: locale },
      group: "general",
    })
    .onConflictDoUpdate({
      target: settings.name,
      set: {
        value: { default: locale },
        updatedAt: new Date(),
      },
    });
}

export { getGeneralSettings, saveGeneralSetting, saveDefaultLanguage };
