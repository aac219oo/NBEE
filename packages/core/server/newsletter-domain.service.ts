"use server";

import {
  createResendDomain,
  deleteResendDomain,
  getResendDomain,
  verifyResendDomain,
  type ResendDomainStatus,
} from "@heiso/core/lib/email/resend-domain";
import type {
  NewsletterSenderSetting,
  NewsletterSenderVerificationStatus,
} from "@heiso/core/types/newsletter";
import {
  getNewsletterSender,
  setNewsletterSender,
  updateSenderVerificationStatus,
} from "./newsletter-sender.service";

/**
 * Domain Auth 高階邏輯：串接 Resend Domain API 與 tenant DB 的 settings。
 *
 * 本檔案為 server action 層：
 * - `registerSenderDomain`：建立新 domain（Resend + 寫 settings）
 * - `refreshSenderVerification`：查 Resend 最新狀態、寫回 settings（polling 用）
 * - `unregisterSenderDomain`：刪除 Resend domain 並清除 settings（租戶換綁 / 移除用）
 */

export interface RegisterSenderDomainInput {
  domain: string;
  fromName: string;
  fromLocalPart: string;
}

export interface RegisterSenderDomainResult {
  setting: NewsletterSenderSetting;
  /** 是否為 overwrite 既有 resendDomainId（舊的會被刪除）。 */
  replaced: boolean;
}

/**
 * 建立新的寄件 domain 並寫入 settings。
 *
 * 若 settings 已有 `resendDomainId` 且 domain 不同 → 先刪除舊 Resend domain 再建新的。
 * 同 domain 重跑則視為 refresh：呼叫 getResendDomain 更新 records（不重建）。
 */
export async function registerSenderDomain(
  input: RegisterSenderDomainInput,
): Promise<RegisterSenderDomainResult> {
  const { domain, fromName, fromLocalPart } = input;
  validateDomain(domain);
  validateFromLocalPart(fromLocalPart);

  const current = await getNewsletterSender();
  let replaced = false;

  // 既有相同 domain → refresh records，不重建
  if (current.resendDomainId && current.domain === domain) {
    const info = await getResendDomain(current.resendDomainId);
    const next: NewsletterSenderSetting = {
      ...current,
      fromName,
      fromLocalPart,
      dnsRecords: info.records,
      verificationStatus: mapStatus(info.status),
      lastCheckedAt: new Date().toISOString(),
    };
    await setNewsletterSender(next);
    return { setting: next, replaced: false };
  }

  // 既有 domain 不同 → 先砍舊的
  if (current.resendDomainId) {
    try {
      await deleteResendDomain(current.resendDomainId);
      replaced = true;
    } catch (err) {
      // 舊 domain 刪不掉不阻塞建新的（可能已在 Resend 端被清）
      console.warn("[newsletter-domain] deleteResendDomain failed", err);
    }
  }

  const info = await createResendDomain(domain);
  const next: NewsletterSenderSetting = {
    domain,
    fromName,
    fromLocalPart,
    resendDomainId: info.id,
    dnsRecords: info.records,
    verificationStatus: mapStatus(info.status),
    lastCheckedAt: new Date().toISOString(),
  };
  await setNewsletterSender(next);
  return { setting: next, replaced };
}

/**
 * Polling：查 Resend 最新狀態並寫回 settings。
 * 若本地無 resendDomainId 則拋錯（先 register 才能 verify）。
 */
export async function refreshSenderVerification(): Promise<NewsletterSenderSetting> {
  const current = await getNewsletterSender();
  if (!current.resendDomainId) {
    throw new Error(
      "refreshSenderVerification: no resendDomainId in settings; call registerSenderDomain first",
    );
  }

  const info = await getResendDomain(current.resendDomainId);
  const next: NewsletterSenderSetting = {
    ...current,
    dnsRecords: info.records,
    verificationStatus: mapStatus(info.status),
    lastCheckedAt: new Date().toISOString(),
  };
  await setNewsletterSender(next);
  return next;
}

/**
 * 主動觸發 Resend 驗證（UI「重新驗證」按鈕）。
 * Resend `verify` endpoint 是非同步的：回呼後仍需再 polling 狀態。
 * 為體驗流暢，本函式觸發後立即 refresh 一次回傳目前狀態。
 */
export async function triggerSenderVerify(): Promise<NewsletterSenderSetting> {
  const current = await getNewsletterSender();
  if (!current.resendDomainId) {
    throw new Error("triggerSenderVerify: no resendDomainId; register first");
  }
  await verifyResendDomain(current.resendDomainId);
  return await refreshSenderVerification();
}

/**
 * 解除 domain 綁定：刪除 Resend domain、清空 settings（保留 row 但 reset）。
 */
export async function unregisterSenderDomain(): Promise<NewsletterSenderSetting> {
  const current = await getNewsletterSender();
  if (current.resendDomainId) {
    try {
      await deleteResendDomain(current.resendDomainId);
    } catch (err) {
      console.warn("[newsletter-domain] deleteResendDomain failed", err);
    }
  }
  const reset: NewsletterSenderSetting = { verificationStatus: "pending" };
  await setNewsletterSender(reset);
  return reset;
}

// Re-export for consumers
export { updateSenderVerificationStatus };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapStatus(
  status: ResendDomainStatus,
): NewsletterSenderVerificationStatus {
  if (status === "verified") return "verified";
  if (status === "failed") return "failed";
  // pending / temporary_failure 歸一為 pending（UI 顯示「驗證中」）
  return "pending";
}

function validateDomain(domain: string): void {
  // 基本 domain 格式：label(.label)+，不檢查 TLD 是否存在
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }
}

function validateFromLocalPart(localPart: string): void {
  // RFC 5321 local-part：英數 + . _ - +
  if (!/^[a-z0-9][a-z0-9._+-]{0,63}$/i.test(localPart)) {
    throw new Error(`Invalid from local-part: ${localPart}`);
  }
}
