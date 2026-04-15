/**
 * Newsletter sender 相關的 settings key 常數。
 * 獨立於 "use server" service 之外，讓 client / server 都可安全 import。
 */

/**
 * `settings` 表中儲存 newsletter sender 設定的固定 name。
 */
export const NEWSLETTER_SENDER_SETTING_NAME = "newsletter.sender";

/**
 * `settings` 表中儲存 Resend Webhook Signing Secret 的固定 name。
 * 此 row `isKey=true` 以示敏感值（不隨 `getSettings()` 泛讀取返回）。
 */
export const NEWSLETTER_WEBHOOK_SECRET_NAME = "newsletter.webhookSecret";
