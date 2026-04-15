import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { settings } from "@heiso/core/config";
import type {
  EmailProvider,
  SendOptions,
  SendResult,
} from "./provider.interface";

/**
 * Resend 的 EmailProvider 實作。
 *
 * - 封裝 Resend SDK 呼叫，normalize 回傳為 `SendResult`
 * - 失敗時拋 Error（不回傳 undefined/null），呼叫端一致處理
 * - Webhook signature 驗證使用 svix-signature / resend-signature header；
 *   secret 從環境變數 `RESEND_WEBHOOK_SECRET` 讀取
 */
export class ResendProvider implements EmailProvider {
  private _client: Resend | null = null;

  private async getClient(): Promise<Resend> {
    if (!this._client) {
      const { RESEND_API_KEY } = await settings();
      if (!RESEND_API_KEY) {
        throw new Error(
          "ResendProvider: RESEND_API_KEY is not configured",
        );
      }
      this._client = new Resend(RESEND_API_KEY as string);
    }
    return this._client;
  }

  async send(options: SendOptions): Promise<SendResult> {
    const client = await this.getClient();
    const result = await client.emails.send(toResendPayload(options));

    if (result.error) {
      throw new Error(
        `Resend send failed: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }
    if (!result.data?.id) {
      throw new Error("Resend send returned no message id");
    }
    return { messageId: result.data.id };
  }

  async sendBatch(items: SendOptions[]): Promise<SendResult[]> {
    if (items.length === 0) return [];
    if (items.length > 100) {
      throw new Error(
        `ResendProvider.sendBatch: max 100 items per call (got ${items.length})`,
      );
    }

    const client = await this.getClient();
    const result = await client.batch.send(items.map(toResendPayload));

    if (result.error) {
      throw new Error(
        `Resend batch failed: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }
    const rows = result.data?.data ?? [];
    if (rows.length !== items.length) {
      throw new Error(
        `Resend batch returned ${rows.length} results, expected ${items.length}`,
      );
    }
    return rows.map((r: { id: string }) => ({ messageId: r.id }));
  }

  /**
   * 驗證 Resend webhook signature。
   *
   * Resend 使用 Svix 發送 webhook，header 為 `svix-signature`（多值空白分隔，
   * 格式 `v1,<base64-hmac>`）。secret 格式為 `whsec_<base64>`。
   * 參考：https://resend.com/docs/dashboard/webhooks/verify-webhooks
   *
   * Secret 優先序：
   * 1. 呼叫端傳入的 `options.secret`（多租戶下的 tenant-specific secret）
   * 2. 環境變數 `RESEND_WEBHOOK_SECRET`（單租戶 / 後相容 fallback）
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    options?: { secret?: string | null },
  ): boolean {
    const secret = options?.secret ?? process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error(
        "ResendProvider.verifyWebhookSignature: no secret provided (neither options.secret nor RESEND_WEBHOOK_SECRET env var)",
      );
    }

    // Svix signature header 可能有多個簽章，找 v1 版本
    const candidates = signature
      .split(" ")
      .map((s) => s.trim())
      .filter((s) => s.startsWith("v1,"));
    if (candidates.length === 0) return false;

    const secretBytes = secret.startsWith("whsec_")
      ? Buffer.from(secret.slice("whsec_".length), "base64")
      : Buffer.from(secret, "utf8");

    const expected = createHmac("sha256", secretBytes)
      .update(payload)
      .digest("base64");

    return candidates.some((candidate) => {
      const provided = candidate.slice("v1,".length);
      try {
        const a = Buffer.from(provided, "base64");
        const b = Buffer.from(expected, "base64");
        if (a.length !== b.length) return false;
        return timingSafeEqual(a, b);
      } catch {
        return false;
      }
    });
  }
}

/**
 * 將內部 SendOptions 轉為 Resend SDK 的 payload。
 *
 * Resend SDK 的型別 `CreateEmailOptions` 在 type 層面要求 text/html/react 至少一個存在；
 * 實務上我們一律會傳 html 或 react，因此這裡用 `unknown` 中介 cast 避免 discriminated union 的過嚴檢查。
 */
function toResendPayload(options: SendOptions) {
  const payload: Record<string, unknown> = {
    from: options.from,
    to: options.to,
    subject: options.subject,
  };
  if (options.body !== undefined) payload.html = options.body;
  if (options.react !== undefined) payload.react = options.react;
  if (options.headers) payload.headers = options.headers;
  if (options.tags) {
    payload.tags = Object.entries(options.tags).map(([name, value]) => ({
      name,
      value,
    }));
  }
  return payload as unknown as Parameters<Resend["emails"]["send"]>[0];
}
