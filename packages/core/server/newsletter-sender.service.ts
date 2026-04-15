"use server";

import { eq } from "drizzle-orm";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { settings } from "@heiso/core/lib/db/schema";
import type { NewsletterSenderSetting } from "@heiso/core/types/newsletter";
import {
  NEWSLETTER_SENDER_SETTING_NAME,
  NEWSLETTER_WEBHOOK_SECRET_NAME,
} from "./newsletter-sender.constants";

/**
 * 預設值：當 settings 表無對應 row 時回傳。
 */
const DEFAULT_SENDER_SETTING: NewsletterSenderSetting = {
  verificationStatus: "pending",
};

/**
 * 讀取 newsletter sender 設定。若尚未建立則回傳預設（verificationStatus='pending'）。
 */
export async function getNewsletterSender(): Promise<NewsletterSenderSetting> {
  const db = await getDynamicDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.name, NEWSLETTER_SENDER_SETTING_NAME))
    .limit(1);

  if (!row) return { ...DEFAULT_SENDER_SETTING };

  // value 是 json，轉型為 NewsletterSenderSetting
  const value = row.value as Partial<NewsletterSenderSetting> | null;
  if (!value) return { ...DEFAULT_SENDER_SETTING };

  return {
    verificationStatus: value.verificationStatus ?? "pending",
    domain: value.domain,
    fromName: value.fromName,
    fromLocalPart: value.fromLocalPart,
    resendDomainId: value.resendDomainId,
    dnsRecords: value.dnsRecords,
    lastCheckedAt: value.lastCheckedAt,
  };
}

/**
 * 覆寫 newsletter sender 設定（整筆 row 的 value 欄位）。
 * Upsert：不存在就建立、存在就更新。
 */
export async function setNewsletterSender(
  value: NewsletterSenderSetting,
): Promise<void> {
  const db = await getDynamicDb();
  await db
    .insert(settings)
    .values({
      name: NEWSLETTER_SENDER_SETTING_NAME,
      value,
      group: "system",
      description: "Newsletter 寄件 domain 設定與 Resend 驗證狀態",
    })
    .onConflictDoUpdate({
      target: settings.name,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}

/**
 * 僅更新 verificationStatus 與 lastCheckedAt（polling 用）。
 * 其他欄位保留不變。
 */
export async function updateSenderVerificationStatus(
  status: NewsletterSenderSetting["verificationStatus"],
): Promise<NewsletterSenderSetting> {
  const current = await getNewsletterSender();
  const next: NewsletterSenderSetting = {
    ...current,
    verificationStatus: status,
    lastCheckedAt: new Date().toISOString(),
  };
  await setNewsletterSender(next);
  return next;
}

/**
 * 便利函式：組出寄件人字串 `"{fromName} <{fromLocalPart}@{domain}>"`。
 * 若必要欄位缺失則回 null。
 */
export async function getSenderFromAddress(): Promise<string | null> {
  const s = await getNewsletterSender();
  if (!s.domain || !s.fromLocalPart) return null;
  const name = s.fromName ?? "Newsletter";
  return `${name} <${s.fromLocalPart}@${s.domain}>`;
}

/**
 * 讀取 tenant 的 Resend Webhook Signing Secret（`whsec_*`）。
 * 此 row 標記 `isKey=true` 不會被泛讀 API 回傳。
 * 未設定時回 null，呼叫端可 fallback 到環境變數。
 */
export async function getWebhookSecret(): Promise<string | null> {
  const db = await getDynamicDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.name, NEWSLETTER_WEBHOOK_SECRET_NAME))
    .limit(1);
  if (!row) return null;
  const value = row.value;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "secret" in value) {
    const s = (value as { secret?: unknown }).secret;
    return typeof s === "string" ? s : null;
  }
  return null;
}

/**
 * 寫入 tenant 的 Resend Webhook Signing Secret。
 * 空字串視為清除（寫 null）。
 */
export async function setWebhookSecret(secret: string | null): Promise<void> {
  const db = await getDynamicDb();
  const normalized = secret && secret.trim().length > 0 ? secret.trim() : null;
  await db
    .insert(settings)
    .values({
      name: NEWSLETTER_WEBHOOK_SECRET_NAME,
      value: normalized,
      group: "system",
      isKey: true,
      description: "Resend webhook signing secret (whsec_*)",
    })
    .onConflictDoUpdate({
      target: settings.name,
      set: {
        value: normalized,
        isKey: true,
        updatedAt: new Date(),
      },
    });
}
