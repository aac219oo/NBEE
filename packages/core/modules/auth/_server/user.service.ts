"use server";

import { sendInvite } from "@heiso/core/modules/permission/team/_server/team.service";
import { type Transaction } from "@heiso/core/lib/db";
import {
  foreignAccounts,
  accounts,
} from "@heiso/core/lib/db/schema";
import { generateInviteToken } from "@heiso/core/lib/id-generator";
import { and, eq, isNull } from "drizzle-orm";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";

/**
 * 檢查是否為 Core 模式
 */
const isCoreMode = () => process.env.APP_MODE === "core";

/**
 * HiveAccount 類型定義
 */
export type HiveAccount = {
  id: string;
  email: string;
  name: string;
  password: string;
  active: boolean;
  avatar?: string | null;
  lastLoginAt?: Date | null;
};

/**
 * 取得 PlatformAccountAdapter（僅在非 Core 模式時使用）
 */
async function getPlatformAdapter() {
  const { getPlatformAccountAdapter } = await import("@heiso/core/lib/adapters");
  const adapter = getPlatformAccountAdapter();
  if (!adapter) {
    throw new Error("PlatformAccountAdapter not registered");
  }
  return adapter;
}

/**
 * 取得所有帳號 (用於管理介面)
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 FDW foreignAccounts
 */
export async function getAccounts() {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    const result = await db.query.accounts.findMany({
      where: (t, { isNull }) => isNull(t.deletedAt),
    });
    return result;
  } else {
    const result = await db.select().from(foreignAccounts);
    return result;
  }
}

/**
 * 取得成員的登入方式
 * @param accountId - Account ID
 */
export async function getLoginMethod(accountId: string) {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    columns: { loginMethod: true },
    where: (t, { eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });

  return account?.loginMethod ?? "both";
}

/**
 * 取得成員狀態
 * 統一使用 accounts 表
 * @param accountId - Account ID
 */
export async function getMemberStatus(accountId: string) {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    columns: { status: true },
    where: (t, { eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });
  return account?.status ?? null;
}

/**
 * 透過 accountId 取得成員資訊
 * 統一使用 accounts 表
 * @param accountId - Account ID
 */
export async function getMember(accountId: string) {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    columns: {
      id: true,
      status: true,
      roleId: true,
      role: true,
    },
    where: (t, { eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });

  if (!account) return null;

  return {
    id: account.id,
    accountId: account.id,
    status: account.status,
    roleId: account.roleId,
    role: account.role,
  };
}

/**
 * 透過 accountId 取得成員的邀請 token
 * 統一使用 accounts 表
 * @param accountId - Account ID
 */
export async function getMemberInviteToken(accountId: string) {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    columns: { inviteToken: true },
    where: (t, { eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });
  return account?.inviteToken ?? null;
}

/**
 * 取得帳號資訊
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 FDW foreignAccounts
 * @param accountId - Account ID
 */
export async function getAccount(accountId: string) {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    const account = await db.query.accounts.findFirst({
      where: (t, { eq, isNull }) =>
        and(eq(t.id, accountId), isNull(t.deletedAt)),
    });
    return account ?? null;
  } else {
    const [account] = await db
      .select()
      .from(foreignAccounts)
      .where(eq(foreignAccounts.id, accountId))
      .limit(1);
    return account ?? null;
  }
}

/**
 * 重寄邀請 email 給成員
 * @param email - Email
 */
export async function resendInviteByEmail(email: string) {
  const account = await getAccountByEmail(email);
  if (!account) {
    throw new Error("Account not found");
  }
  return resendInviteByAccountId(account.id);
}

/**
 * 重寄邀請 email 給成員
 * 統一使用 accounts 表
 * @param accountId - Account ID
 */
export async function resendInviteByAccountId(accountId: string) {
  const db = await getDynamicDb();
  const inviteToken = generateInviteToken();
  const inviteExpiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const account = await db.query.accounts.findFirst({
    where: (t, { eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });

  if (!account) {
    throw new Error("Account not found");
  }

  await db
    .update(accounts)
    .set({
      inviteToken,
      inviteExpiredAt,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, accountId));

  const result = await sendInvite({
    email: account.email,
    inviteToken,
    isOwner: account.role === "owner",
  });

  return result;
}

/**
 * 確保帳號有有效的邀請 token（不發送 email）
 * - 若 token 遺失或過期，刷新 token
 * 統一使用 accounts 表
 * @param accountId - Account ID
 */
export async function ensureInviteTokenSilently(accountId: string) {
  const db = await getDynamicDb();
  const now = Date.now();

  const account = await db.query.accounts.findFirst({
    where: (t, { eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });

  if (!account) return null;

  const needsNewToken =
    !account.inviteToken ||
    !account.inviteExpiredAt ||
    account.inviteExpiredAt.getTime() < now;

  if (needsNewToken) {
    const inviteToken = generateInviteToken();
    const inviteExpiredAt = new Date(now + 1000 * 60 * 60 * 24 * 7);

    const [updated] = await db
      .update(accounts)
      .set({
        inviteToken,
        inviteExpiredAt,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning({ inviteToken: accounts.inviteToken });

    return updated?.inviteToken ?? null;
  }

  return account.inviteToken;
}

/**
 * 首次登入：設定帳號狀態為 active
 * 統一使用 accounts 表
 * @param accountId - Account ID
 * @param tx - 可選的 transaction
 */
export async function ensureMemberOnFirstLogin(
  accountId: string,
  tx?: Transaction,
) {
  const db = tx ?? (await getDynamicDb());

  const account = await db.query.accounts.findFirst({
    where: (t, { eq, isNull }) =>
      and(eq(t.id, accountId), isNull(t.deletedAt)),
  });

  if (!account) return null;

  // 檢查是否有 owner
  const existingOwner = await db.query.accounts.findFirst({
    where: (t, { eq, isNull }) =>
      and(eq(t.role, "owner"), isNull(t.deletedAt)),
    columns: { id: true },
  });

  const shouldBeOwner = !existingOwner;
  let assignedRoleId = account.roleId;

  // 若為 owner 且沒有角色，指派 Admin 角色
  if ((shouldBeOwner || account.role === "owner") && !assignedRoleId) {
    const adminRole = await db.query.roles.findFirst({
      where: (t, { eq, isNull }) =>
        and(eq(t.name, "Admin"), isNull(t.deletedAt)),
      columns: { id: true },
    });
    if (adminRole) {
      assignedRoleId = adminRole.id;
    }
  }

  const [updated] = await db
    .update(accounts)
    .set({
      roleId: assignedRoleId,
      status: "active",
      role: account.role === "owner" || shouldBeOwner ? "owner" : account.role,
      joinedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, accountId))
    .returning({
      id: accounts.id,
      status: accounts.status,
      role: accounts.role,
    });

  return updated
    ? { ...updated, accountId: updated.id }
    : null;
}

/**
 * 檢查當前 tenant 是否有 owner
 * 統一使用 accounts 表
 */
export async function checkTenantHasOwner() {
  const db = await getDynamicDb();

  const owner = await db.query.accounts.findFirst({
    where: (t, { eq, isNull }) =>
      and(eq(t.role, "owner"), isNull(t.deletedAt)),
    columns: { id: true },
  });
  return !!owner;
}

/**
 * 透過 email 取得帳號
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 FDW foreignAccounts
 */
export async function getAccountByEmail(email: string) {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：使用本地 accounts 表
    const account = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.email, email),
    });
    return account ?? null;
  } else {
    // APPS 模式：使用 FDW foreignAccounts
    const account = await db.query.foreignAccounts.findFirst({
      where: eq(foreignAccounts.email, email),
    });
    return account ?? null;
  }
}

/**
 * 透過 email 取得帳號 (包含密碼)
 * Core 模式：使用本地 accounts 表
 * APPS 模式：委派給 hive 層的服務函式
 */
export async function getAccountWithPasswordByEmail(
  email: string,
): Promise<HiveAccount | null> {
  if (isCoreMode()) {
    // Core 模式：使用本地 accounts 表
    const db = await getDynamicDb();
    const account = await db.query.accounts.findFirst({
      where: (t, { eq, isNull }) =>
        and(eq(t.email, email), isNull(t.deletedAt)),
    });

    if (!account) return null;

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
    // APPS 模式：使用 Platform Adapter
    const adapter = await getPlatformAdapter();
    return adapter.getAccountByEmail(email);
  }
}

/**
 * 檢查是否為 Developer (Owner)
 * Core 模式：使用本地 accounts 表檢查 role === 'owner'
 * APPS 模式：委派給 hive 層的服務函式
 */
export async function isUserDeveloper(accountId: string): Promise<boolean> {
  if (isCoreMode()) {
    // Core 模式：檢查本地 accounts 表的 role
    const db = await getDynamicDb();
    const account = await db.query.accounts.findFirst({
      columns: { role: true },
      where: (t, { eq, isNull }) =>
        and(eq(t.id, accountId), isNull(t.deletedAt)),
    });

    return account?.role === "owner";
  } else {
    // APPS 模式：使用 Platform Adapter
    const adapter = await getPlatformAdapter();
    return adapter.checkIsPlatformDeveloper(accountId);
  }
}

/**
 * 取得帳號本身的登入驗證方式 (例如是否為 OAuth)
 */
export async function getUserLoginMethod(accountId: string) {
  return null;
}
