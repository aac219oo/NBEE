"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { members, accounts } from "@heiso/core/lib/db/schema";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getAccount, isUserDeveloper } from "@heiso/core/modules/auth/_server/user.service";

const isCoreMode = () => process.env.APP_MODE === "core";

async function getMembership() {
  const db = await getDynamicDb();
  const session = await auth();
  const accountId = session?.user?.id;

  if (!accountId) {
    throw new Error("Unauthorized");
  }

  // Check if user is developer (owner)
  const isDeveloper = await isUserDeveloper(accountId);

  // If user is developer, no need to query membership
  if (isDeveloper) {
    return { isDeveloper, membership: null };
  }

  if (isCoreMode()) {
    // Core 模式：使用 accounts 表
    const account = await db.query.accounts.findFirst({
      columns: {
        id: true,
        role: true,
        roleId: true,
      },
      with: {
        customRole: {
          columns: {
            id: true,
            fullAccess: true,
          },
        },
      },
      where: (t, { eq, isNull }) =>
        and(eq(t.id, accountId), eq(t.status, "active"), isNull(t.deletedAt)),
    });

    return {
      isDeveloper,
      membership: account
        ? { id: account.id, role: account.role, customRole: account.customRole }
        : null,
    };
  } else {
    // APPS 模式：使用 members 表
    const membership = await db.query.members.findFirst({
      columns: {
        id: true,
        role: true,
      },
      with: {
        role: {
          columns: {
            id: true,
            fullAccess: true,
          },
        },
      },
      where: (t, { eq }) =>
        and(eq(t.accountId, accountId), eq(t.status, "active")),
    });

    return { isDeveloper, membership };
  }
}

async function getInviteToken({ token }: { token: string }) {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：使用 accounts 表
    const account = await db.query.accounts.findFirst({
      where: (t, { eq, isNull }) =>
        and(eq(t.inviteToken, token), isNull(t.deletedAt)),
    });

    if (!account) return null;

    if (!account.inviteExpiredAt || account.inviteExpiredAt < new Date()) {
      return null;
    }

    return {
      id: account.id,
      accountId: account.id,
      inviteToken: account.inviteToken,
      inviteExpiredAt: account.inviteExpiredAt,
      status: account.status,
      account,
    };
  } else {
    // APPS 模式：使用 members 表
    const member = await db.query.members.findFirst({
      where: (t, { eq }) => and(eq(t.inviteToken, token), isNull(t.deletedAt)),
    });

    if (!member || !member.accountId) return null;

    if (!member.inviteExpiredAt || member.inviteExpiredAt < new Date()) {
      return null;
    }

    // Fetch account info via FDW
    const account = await getAccount(member.accountId);

    return {
      ...member,
      account,
    };
  }
}

async function join(memberId: string) {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：更新 accounts 表
    const result = await db
      .update(accounts)
      .set({
        inviteToken: null,
        inviteExpiredAt: null,
        status: "active",
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.id, memberId), isNull(accounts.deletedAt)));

    return result;
  } else {
    // APPS 模式：更新 members 表
    const result = await db
      .update(members)
      .set({
        inviteToken: "",
        inviteExpiredAt: null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(and(eq(members.id, memberId), isNull(members.deletedAt)));

    return result;
  }
}

async function decline(id: string) {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：更新 accounts 表
    return await db
      .update(accounts)
      .set({
        inviteToken: null,
        inviteExpiredAt: null,
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id));
  } else {
    // APPS 模式：更新 members 表
    return await db
      .update(members)
      .set({
        inviteToken: "",
        inviteExpiredAt: null,
        status: "suspended",
      })
      .where(eq(members.id, id));
  }
}

async function removeJoinToken() {
  const cookieStore = await cookies();
  cookieStore.delete("join-token");
}

export { getMembership, getInviteToken, join, decline, removeJoinToken };

/**
 * 更新使用者基本資料（名稱、頭像、密碼）
 * Core 模式：使用本地 accounts 表
 * APPS 模式：使用 Hive 服務
 */
export async function updateBasicProfile({
  accountId,
  name,
  avatar,
  password,
}: {
  accountId: string;
  name?: string;
  avatar?: string | null;
  password?: string;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.id !== accountId) {
    throw new Error("Unauthorized");
  }

  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：直接更新本地 accounts 表
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;

    if (typeof password === "string" && password.trim().length > 0) {
      const { hashPassword } = await import("@heiso/core/lib/hash");
      updates.password = await hashPassword(password.trim());
    }

    await db.update(accounts).set(updates).where(eq(accounts.id, accountId));
  } else {
    // APPS 模式：使用 Platform Adapter 更新密碼
    if (typeof password === "string" && password.trim().length > 0) {
      const { hashPassword } = await import("@heiso/core/lib/hash");
      const { getPlatformAccountAdapter } = await import("@heiso/core/lib/adapters");
      const adapter = getPlatformAccountAdapter();
      if (!adapter) {
        throw new Error("PlatformAccountAdapter not registered");
      }
      const hashedPassword = await hashPassword(password.trim());
      await adapter.updatePassword(accountId, hashedPassword, false);
    }

    // TODO: name 和 avatar 更新需要在 hive accounts 表實作
  }

  return { ok: true };
}
