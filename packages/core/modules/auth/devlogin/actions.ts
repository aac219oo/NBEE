"use server";

import { settings } from "@heiso/core/config/settings";
import TwoFactorEmail from "@heiso/core/emails/2fa";
import { sendEmail } from "@heiso/core/lib/email";
import { ALLOWED_DEV_EMAILS } from "@heiso/core/modules/auth/auth.config";
import { getAccountWithPasswordByEmail } from "@heiso/core/modules/auth/_server/user.service";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { accounts } from "@heiso/core/lib/db/schema";
import { eq } from "drizzle-orm";

const isCoreMode = () => process.env.APP_MODE === "core";

/**
 * 確保 DevLogin 帳號存在
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 Hive 服務
 */
async function ensureDevAccountExists(email: string) {
  // 先嘗試查找現有帳號
  const existing = await getAccountWithPasswordByEmail(email);
  if (existing) {
    return existing;
  }

  // 帳號不存在，建立帳號
  const { hashPassword } = await import("@heiso/core/lib/hash");
  const { generateId } = await import("@heiso/core/lib/id-generator");

  const randomPassword = await hashPassword(generateId(undefined, 32));
  const displayName = email === "pm@heiso.io" ? "Core PM" : "Core Dev";

  if (isCoreMode()) {
    // Core 模式：直接建立本地帳號
    const db = await getDynamicDb();
    const [account] = await db
      .insert(accounts)
      .values({
        email,
        name: displayName,
        password: randomPassword,
        role: "owner",
        status: "active",
        active: true,
      })
      .returning();

    return {
      id: account.id,
      email: account.email,
      name: account.name,
      password: account.password,
      active: account.active,
      avatar: account.avatar,
      lastLoginAt: account.lastLoginAt,
    };
  } else {
    // APPS 模式：使用 Hive 服務
    const { createDevAccount } = await import("@heiso/hive/services/account");
    return createDevAccount(email, randomPassword, displayName);
  }
}

// Generate 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP for DevLogin
 * - Validates email is in allowed list
 * - Ensures account exists (creates if needed)
 * - Generates and sends OTP
 */
export async function sendDevOTP(email: string): Promise<{
  success: boolean;
  error?: string;
  expiresAt?: Date;
}> {
  // 1. Strict email check
  if (!ALLOWED_DEV_EMAILS.includes(email)) {
    return {
      success: false,
      error: "Access Denied. Only authorized emails are allowed.",
    };
  }

  try {
    // 2. Ensure account exists (create if needed)
    const account = await ensureDevAccountExists(email);
    if (!account) {
      return {
        success: false,
        error: "Failed to create or find account",
      };
    }

    // 3. Generate OTP
    const { user2faCode } = await import("@heiso/core/lib/db/schema");
    const { getDynamicDb } = await import("@heiso/core/lib/db/dynamic");
    const { and, eq, lt } = await import("drizzle-orm");

    const db = await getDynamicDb();

    // Clean up expired OTPs for this account
    const now = new Date();
    await db
      .delete(user2faCode)
      .where(
        and(
          eq(user2faCode.accountId, account.id),
          lt(user2faCode.expiresAt, now),
        ),
      );

    // Generate new OTP
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to database
    await db.insert(user2faCode).values({
      accountId: account.id,
      code,
      used: false,
      expiresAt,
    });

    // 4. Send email
    const assets = await db.query.siteSettings.findFirst({
      where: (t, { eq }) => eq(t.name, "assets"),
    });
    const { logo } = (assets?.value || {}) as Record<string, string>;

    const { NOTIFY_EMAIL } = await settings();
    await sendEmail({
      from: (NOTIFY_EMAIL as string) || "noreply@heiso.com",
      to: [email],
      subject: "[DevLogin] Your Verification Code",
      body: TwoFactorEmail({
        logoUrl: logo,
        code,
        username: account.name,
        expiresInMinutes: 10,
      }),
    });

    console.log(`[DevLogin] OTP sent to ${email}: ${code}`); // Dev convenience log

    return {
      success: true,
      expiresAt,
    };
  } catch (error) {
    console.error("[sendDevOTP] Failed:", error);
    return {
      success: false,
      error: "Failed to send OTP. Please try again.",
    };
  }
}

/**
 * Verify OTP for DevLogin
 * Returns userId (accountId) on success for signIn
 */
export async function verifyDevOTP(
  email: string,
  code: string,
): Promise<{
  success: boolean;
  error?: string;
  userId?: string;
}> {
  // 1. Strict email check
  if (!ALLOWED_DEV_EMAILS.includes(email)) {
    return {
      success: false,
      error: "Access Denied",
    };
  }

  try {
    const { user2faCode } = await import("@heiso/core/lib/db/schema");
    const { getDynamicDb } = await import("@heiso/core/lib/db/dynamic");
    const { and, eq, gt } = await import("drizzle-orm");

    const db = await getDynamicDb();

    // Find account
    const account = await getAccountWithPasswordByEmail(email);
    if (!account) {
      return {
        success: false,
        error: "Account not found",
      };
    }

    // Find valid OTP
    const otpRecord = await db.query.user2faCode.findFirst({
      where: and(
        eq(user2faCode.accountId, account.id),
        eq(user2faCode.code, code),
        eq(user2faCode.used, false),
        gt(user2faCode.expiresAt, new Date()),
      ),
    });

    if (!otpRecord) {
      return {
        success: false,
        error: "Invalid or expired code",
      };
    }

    // Mark OTP as used
    await db
      .update(user2faCode)
      .set({ used: true })
      .where(eq(user2faCode.id, otpRecord.id));

    return {
      success: true,
      userId: account.id,
    };
  } catch (error) {
    console.error("[verifyDevOTP] Failed:", error);
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }
}
