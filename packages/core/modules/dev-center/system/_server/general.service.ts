"use server";

import type { Locale } from "@heiso/core/i18n/config";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { generalSettings } from "@heiso/core/lib/db/schema";
import type { Settings } from "@heiso/core/types/system";
import { getTenantId } from "@heiso/core/lib/utils/tenant";

// 讀取 general_settings（系統級設定）
async function getGeneralSettings(): Promise<Settings> {
  const db = await getDynamicDb();
  const settings = await db.query.generalSettings.findMany({
    columns: { name: true, value: true },
    where: (fields, { isNull }) => isNull(fields.deletedAt),
  });
  const result: Record<string, unknown> = {};
  for (const { name, value } of settings) {
    result[name] = value;
  }
  return result;
}

// 寫入 general_settings（以 name 為 key upsert）
async function saveGeneralSetting(data: Settings) {
  const db = await getDynamicDb();

  // Check for domain update
  const basicSettings = (data as any)?.basic;
  if (basicSettings?.domain !== undefined) {
    const tenantId = await getTenantId();

    if (tenantId) {
      try {
        const { getTenantAdapter } = await import("@heiso/core/lib/adapters");
        const tenantAdapter = getTenantAdapter();
        if (tenantAdapter) {
          await tenantAdapter.updateTenant(tenantId, {
            customDomain: basicSettings.domain || null,
          });
        } else {
          console.warn("[saveGeneralSetting] TenantAdapter not registered, skipping remote update");
        }
      } catch (error) {
        console.error("Failed to update tenant custom domain", error);
        // We might want to throw here to prevent saving local settings if remote fails
        // Or just log it. For now, let's throw to notify user via UI error if possible.
        throw new Error("Failed to update custom domain");
      }
    }
  }

  await db.transaction(async (tx) => {
    const entries = Object.entries(data ?? {});
    if (entries.length === 0) return;
    await Promise.all(
      entries.map(async ([key, value]) => {
        await tx
          .insert(generalSettings)
          .values({
            name: key,
            value,
          })
          .onConflictDoUpdate({
            target: [generalSettings.tenantId, generalSettings.name],
            set: {
              value,
            },
          });
      }),
    );
  });
}

// 快捷：更新系統預設語言到 general_settings
async function saveDefaultLanguage(locale: Locale) {
  const db = await getDynamicDb();
  await db
    .insert(generalSettings)
    .values({
      name: "language",
      value: { default: locale },
    })
    .onConflictDoUpdate({
      target: generalSettings.name,
      set: {
        name: "language",
        value: { default: locale },
      },
    });
}

export { getGeneralSettings, saveGeneralSetting, saveDefaultLanguage };
