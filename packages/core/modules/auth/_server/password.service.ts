"use server";

import { settings } from "@heiso/core/config/settings";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { userPasswordReset, accounts } from "@heiso/core/lib/db/schema";
import { sendForgotPasswordEmail } from "@heiso/core/lib/email";
import { hashPassword } from "@heiso/core/lib/hash";
import { generateId } from "@heiso/core/lib/id-generator";
import { eq } from "drizzle-orm";
import { getAccountByEmail } from "./user.service";

const isCoreMode = () => process.env.APP_MODE === "core";

/**
 * 更新帳號密碼
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 Hive 服務
 */
async function updatePassword(
  accountId: string,
  hashedPassword: string,
  mustChange: boolean = false,
) {
  if (isCoreMode()) {
    const db = await getDynamicDb();
    await db
      .update(accounts)
      .set({
        password: hashedPassword,
        mustChangePassword: mustChange,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId));
  } else {
    const { getPlatformAccountAdapter } = await import("@heiso/core/lib/adapters");
    const adapter = getPlatformAccountAdapter();
    if (!adapter) {
      throw new Error("PlatformAccountAdapter not registered");
    }
    await adapter.updatePassword(accountId, hashedPassword, mustChange);
  }
}

/**
 * Request password reset: generate token, persist, and send reset email
 */
export async function requestPasswordReset(email: string) {
  const account = await getAccountByEmail(email);

  // Always return success to prevent email enumeration
  if (!account) {
    return { ok: true };
  }

  const db = await getDynamicDb();

  const token = generateId(undefined, 32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await db.insert(userPasswordReset).values({
    accountId: account.id,
    token,
    expiresAt,
    used: false,
  });

  const { NOTIFY_EMAIL, BASE_HOST } = await settings();
  const resetLink = `${BASE_HOST}/auth/reset-password?token=${token}`;

  await sendForgotPasswordEmail({
    from: NOTIFY_EMAIL as string,
    to: [email],
    subject: "Reset your password",
    resetLink,
    name: account.name ?? "",
  });

  return { ok: true };
}

/**
 * Reset password using token: validate, update user password, mark token used
 */
export async function resetPassword(token: string, newPassword: string) {
  const db = await getDynamicDb();
  const record = await db.query.userPasswordReset.findFirst({
    where: (t, { and, eq, gt }) =>
      and(eq(t.token, token), eq(t.used, false), gt(t.expiresAt, new Date())),
  });

  if (!record || !record.accountId) {
    throw new Error("Invalid or expired reset token");
  }

  const hashedPassword = await hashPassword(newPassword);

  await updatePassword(record.accountId, hashedPassword, false);

  await db
    .update(userPasswordReset)
    .set({ used: true })
    .where(eq(userPasswordReset.id, record.id));

  return { ok: true };
}

/**
 * Directly change the user's password
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 Hive 服務
 */
export async function changePassword(accountId: string, newPassword: string) {
  const hashedPassword = await hashPassword(newPassword);
  await updatePassword(accountId, hashedPassword, false);
}

