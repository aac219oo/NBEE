"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { z } from "zod";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * 更新密碼
 * 注意：密碼儲存在 Platform DB，此功能需要 Platform API 支援
 */
export async function updatePassword(accountId: string, data: unknown) {
  const result = passwordSchema.safeParse(data);
  if (!result.success) {
    throw new Error("Invalid password format");
  }

  // TODO: 呼叫 Platform API 更新密碼
  // 密碼現在儲存在 Platform DB 的 accounts 表
  // 需要實作 Platform API: POST /api/platform/accounts/:accountId/update-password
  console.warn("[updatePassword] Password update requires Platform API implementation");

  throw new Error("Password update requires Platform API implementation");
}

/**
 * 切換 2FA
 * 注意：2FA 設定儲存在 Platform DB，此功能需要 Platform API 支援
 */
export async function toggle2FA(accountId: string, enabled: boolean) {
  // TODO: 呼叫 Platform API 更新 2FA 設定
  // 2FA 設定現在儲存在 Platform DB 的 accounts 表
  console.warn("[toggle2FA] 2FA toggle requires Platform API implementation");

  throw new Error("2FA toggle requires Platform API implementation");
}

/**
 * 透過 accountId 查詢成員資格（含角色）
 * 統一使用 accounts 表
 */
export async function findMembershipByAccountId(accountId: string) {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    columns: {
      id: true,
      status: true,
      role: true,
      roleId: true,
    },
    with: {
      customRole: {
        columns: { id: true, name: true, fullAccess: true }
      }
    },
    where: (t, { and, eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });

  if (!account) return null;

  return {
    id: account.id,
    accountId: account.id,
    status: account.status,
    role: account.role,
    customRole: account.customRole,
  };
}

/**
 * @deprecated 使用 findMembershipByAccountId 代替
 */
export async function findMembershipByUserOrEmail(params: {
  userId?: string;
  email?: string;
}) {
  console.warn('[DEPRECATED] findMembershipByUserOrEmail is deprecated. Use findMembershipByAccountId instead.');

  const { userId } = params || {};

  // 嘗試將 userId 作為 accountId 使用
  if (userId) {
    return findMembershipByAccountId(userId);
  }

  return null;
}
