/**
 * Newsletter 相關的共用型別定義。
 */

export type NewsletterSenderVerificationStatus =
  | "pending"
  | "verified"
  | "failed";

/**
 * DNS record 項目。type=MX 時需要 priority；TXT / CNAME 不需要。
 */
export interface NewsletterSenderDnsRecord {
  type: "TXT" | "MX" | "CNAME";
  name: string;
  value: string;
  priority?: number;
  status?: string;
}

/**
 * 儲存於 tenant DB 的 `settings` 表中 `name='newsletter.sender'`, `group='system'` 的 value 結構。
 *
 * - 若 row 不存在：呼叫端 SHALL 視為 `{ verificationStatus: 'pending' }`
 * - `domain`：寄件網域（例 `yeniverse.com`），完成 Resend 註冊後才填入
 * - `fromName`：Email 顯示的寄件人名稱（例「NBEE」）
 * - `fromLocalPart`：From 位址的 local-part（例「hello」→ 最終寄件位址 hello@yeniverse.com）
 * - `resendDomainId`：Resend 建立 domain 後回傳的 ID，用於後續 verify / delete 呼叫
 * - `verificationStatus`：對應 Resend Domain status 的簡化狀態
 * - `dnsRecords`：Resend 回傳的 DKIM / SPF / MX records，UI 顯示給使用者複製到 DNS 設定
 * - `lastCheckedAt`：最後一次呼叫 `verifySenderDomain()` 的時間（ISO string）
 */
export interface NewsletterSenderSetting {
  domain?: string;
  fromName?: string;
  fromLocalPart?: string;
  resendDomainId?: string;
  verificationStatus: NewsletterSenderVerificationStatus;
  dnsRecords?: NewsletterSenderDnsRecord[];
  lastCheckedAt?: string;
}
