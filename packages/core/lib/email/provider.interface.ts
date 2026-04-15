import type React from "react";

/**
 * EmailProvider 抽象層。
 *
 * 所有 NBEE 寄信操作都透過此 interface 執行；預設實作為 `ResendProvider`。
 * 未來若需接入 SES / SendGrid / Postmark，實作同 interface 即可不動業務邏輯。
 *
 * 設計原則：
 * - 單次寄送用 `send`；多筆（Newsletter 批次）用 `sendBatch`
 * - `headers` 可帶 List-Unsubscribe 等自訂 header
 * - `verifyWebhookSignature` 給 webhook endpoint 使用，Provider 自己持有 signing secret 來源
 */
export interface EmailProvider {
  send(options: SendOptions): Promise<SendResult>;
  sendBatch(items: SendOptions[]): Promise<SendResult[]>;
  /**
   * 驗證 webhook payload 的 signature。回 true 表示合法。
   *
   * @param payload 原始 request body 字串
   * @param signature 請求 header 中的 signature
   * @param options.secret 選填：明確指定 secret（多租戶下用 tenant-specific secret）。
   *                       未提供時 provider 會 fallback 到環境變數。
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    options?: { secret?: string | null },
  ): boolean;
}

/**
 * 寄信參數。
 *
 * `body` 與 `react` 二擇一：
 * - `body`: 已渲染的 HTML string
 * - `react`: React Email 元件，由 provider 自行 render
 */
export interface SendOptions {
  from: string;
  to: string[];
  subject: string;
  body?: string;
  react?: React.ReactNode;
  /** 自訂 header，例如 `List-Unsubscribe` / `List-Unsubscribe-Post`。 */
  headers?: Record<string, string>;
  /** 用於 webhook 對單的標示（Resend 為 tags）。 */
  tags?: Record<string, string>;
}

export interface SendResult {
  messageId: string;
}
