import config, { settings } from "@heiso/core/config";
import ApprovedEmail from "@heiso/core/emails/approved";
import { ForgotPasswordEmail } from "@heiso/core/emails/forgot-password";
import InviteOwnerEmail from "@heiso/core/emails/invite-owner";
import { InviteUserEmail } from "@heiso/core/emails/invite-user";
import { getSiteSettings } from "@heiso/core/server/site.service";
import type {
  EmailProvider,
  SendOptions,
  SendResult,
} from "./provider.interface";
import { ResendProvider } from "./resend.provider";

export type { EmailProvider, SendOptions, SendResult } from "./provider.interface";

/**
 * Provider singleton。本 change 僅實作 Resend；未來需要切換時改這裡一個點。
 */
let _provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!_provider) {
    _provider = new ResendProvider();
  }
  return _provider;
}

/**
 * 測試用：覆寫 singleton provider（例如 FakeProvider）。
 */
export function setEmailProvider(provider: EmailProvider | null): void {
  _provider = provider;
}

/**
 * 寄送單封信。
 *
 * 統一進入點。若呼叫端傳 React 元件作為 body，會自動轉為 provider 的 `react` 參數。
 * `headers` 可帶 List-Unsubscribe 等自訂 header（Newsletter 用）。
 */
export async function sendEmail({
  from,
  to,
  subject,
  body,
  headers,
}: {
  from: string;
  to: string[];
  subject: string;
  body: string | React.ReactNode;
  headers?: Record<string, string>;
}): Promise<SendResult> {
  const provider = getEmailProvider();
  const options: SendOptions = {
    from,
    to,
    subject,
    headers,
  };
  if (typeof body === "string") {
    options.body = body;
  } else {
    options.react = body;
  }
  return await provider.send(options);
}

/**
 * 批次寄送（Newsletter 用）。
 *
 * 呼叫端應自行按語言分組並每批最多 100 封；此 function 直接透傳給 provider。
 */
export async function sendNewsletterBatch(
  items: SendOptions[],
): Promise<SendResult[]> {
  return await getEmailProvider().sendBatch(items);
}

// ---------------------------------------------------------------------------
// 既有 transactional email 函式：保留簽章、內部改走 provider
// ---------------------------------------------------------------------------

export async function sendInviteUserEmail({
  from,
  to,
  owner = false,
  inviteToken,
}: {
  from: string;
  to: string[];
  owner?: boolean;
  inviteToken: string;
}) {
  const site: any = await getSiteSettings();
  const { BASE_HOST } = await settings();

  const siteLogo = site?.assets?.logo || "/images/logo.png";
  const derivedLogoUrl =
    typeof siteLogo === "string" && siteLogo.startsWith("http")
      ? siteLogo
      : `${BASE_HOST}${siteLogo}`;
  const orgName = site?.branding?.organization || config?.site?.organization;
  const subject = `Verify Your Email Address for ${orgName}`;
  const inviteLink = `${BASE_HOST}/join?token=${inviteToken}`;

  const emailType = {
    logoUrl: derivedLogoUrl,
    orgName,
    inviteLink,
  };

  const email = owner
    ? InviteOwnerEmail(emailType)
    : InviteUserEmail(emailType);
  return await sendEmail({ from, to, subject, body: email });
}

export async function sendForgotPasswordEmail({
  from,
  to,
  subject,
  name,
  resetLink,
}: {
  from: string;
  to: string[];
  subject: string;
  name?: string;
  resetLink: string;
}) {
  const site: any = await getSiteSettings();
  const { BASE_HOST } = await settings();
  const siteLogo = site?.assets?.logo || "/images/logo.png";
  const derivedLogoUrl =
    typeof siteLogo === "string" && siteLogo.startsWith("http")
      ? siteLogo
      : `${BASE_HOST}${siteLogo}`;
  const orgName = site?.branding?.organization || config?.site?.organization;

  const email = ForgotPasswordEmail({
    resetLink,
    orgName: orgName,
    logoUrl: derivedLogoUrl,
  });

  return await sendEmail({
    from,
    to,
    subject: subject || "Reset your password",
    body: email,
  });
}

export async function sendApprovedEmail({
  from,
  to,
}: {
  from: string;
  to: string[];
}) {
  const site: any = await getSiteSettings();
  const { BASE_HOST } = await settings();
  const siteLogo = site?.assets?.logo || "/images/logo.png";
  const derivedLogoUrl =
    typeof siteLogo === "string" && siteLogo.startsWith("http")
      ? siteLogo
      : `${BASE_HOST}${siteLogo}`;
  const orgName = site?.branding?.organization || config?.site?.organization;

  const email = ApprovedEmail({
    loginUrl: `${BASE_HOST}/login`,
    orgName: orgName,
    logoUrl: derivedLogoUrl,
  });

  return await sendEmail({
    from,
    to,
    subject: `Congratulations! Your ${orgName} Account Has Been Approved`,
    body: email,
  });
}
