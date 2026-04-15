import { Resend } from "resend";
import { settings } from "@heiso/core/config";
import type { NewsletterSenderDnsRecord } from "@heiso/core/types/newsletter";

/**
 * Resend Domain API 封裝。
 *
 * 提供 create / get / verify / delete 四個低階操作，呼叫 Resend 的 `/domains/*` endpoints。
 * 回傳結構已 normalize 為 NBEE 內部 DNS record 型別。
 *
 * 本檔案**不寫入 DB**：高階邏輯（register / verify + 寫 settings）見
 * `@heiso/core/server/newsletter-domain.service.ts`。
 */

let _client: Resend | null = null;

async function getClient(): Promise<Resend> {
  if (!_client) {
    const { RESEND_API_KEY } = await settings();
    _client = new Resend(RESEND_API_KEY as string);
  }
  return _client;
}

export type ResendDomainStatus =
  | "pending"
  | "verified"
  | "failed"
  | "temporary_failure";

export interface ResendDomainInfo {
  id: string;
  name: string;
  status: ResendDomainStatus;
  region?: string;
  records: NewsletterSenderDnsRecord[];
  createdAt?: string;
}

/**
 * 建立新的寄件 domain。呼叫 `POST /domains`。
 * 回傳含 DKIM / SPF / MX 的 DNS records 供使用者加到自己 DNS 服務商。
 */
export async function createResendDomain(
  domainName: string,
): Promise<ResendDomainInfo> {
  const client = await getClient();
  const result = await client.domains.create({ name: domainName });

  if (result.error) {
    throw new Error(
      `Resend createDomain failed: ${result.error.message ?? JSON.stringify(result.error)}`,
    );
  }
  const data = result.data;
  if (!data) {
    throw new Error("Resend createDomain returned no data");
  }

  return normalizeDomainInfo(data);
}

/**
 * 查詢 domain 狀態與 DNS records。呼叫 `GET /domains/{id}`。
 * 用於 polling verification 進度。
 */
export async function getResendDomain(id: string): Promise<ResendDomainInfo> {
  const client = await getClient();
  const result = await client.domains.get(id);

  if (result.error) {
    throw new Error(
      `Resend getDomain failed: ${result.error.message ?? JSON.stringify(result.error)}`,
    );
  }
  const data = result.data;
  if (!data) {
    throw new Error("Resend getDomain returned no data");
  }

  return normalizeDomainInfo(data);
}

/**
 * 主動觸發 domain 驗證（Resend 會檢查 DNS records 是否正確）。
 * 呼叫 `POST /domains/{id}/verify`。
 */
export async function verifyResendDomain(id: string): Promise<void> {
  const client = await getClient();
  const result = await client.domains.verify(id);

  if (result.error) {
    throw new Error(
      `Resend verifyDomain failed: ${result.error.message ?? JSON.stringify(result.error)}`,
    );
  }
}

/**
 * 刪除 domain（domain 換綁或 tenant 移除時用）。呼叫 `DELETE /domains/{id}`。
 */
export async function deleteResendDomain(id: string): Promise<void> {
  const client = await getClient();
  const result = await client.domains.remove(id);

  if (result.error) {
    throw new Error(
      `Resend deleteDomain failed: ${result.error.message ?? JSON.stringify(result.error)}`,
    );
  }
}

/**
 * 把 Resend SDK 回傳的 raw domain 物件 normalize 為內部型別。
 */
function normalizeDomainInfo(data: any): ResendDomainInfo {
  const records: NewsletterSenderDnsRecord[] = Array.isArray(data.records)
    ? data.records.map((r: any) => ({
        type: (r.record ?? r.type) as NewsletterSenderDnsRecord["type"],
        name: r.name,
        value: r.value ?? r.content ?? "",
        priority: r.priority,
        status: r.status,
      }))
    : [];

  return {
    id: data.id,
    name: data.name,
    status: normalizeStatus(data.status),
    region: data.region,
    records,
    createdAt: data.created_at ?? data.createdAt,
  };
}

function normalizeStatus(status: unknown): ResendDomainStatus {
  if (status === "verified") return "verified";
  if (status === "failed") return "failed";
  if (status === "temporary_failure") return "temporary_failure";
  // Resend 初始狀態可能是 "not_started" / "pending" / 未知字串 → 統一視為 pending
  return "pending";
}
