"use server";

import { settings } from "@heiso/core/config/settings";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { foreignAccounts, accounts } from "@heiso/core/lib/db/schema";
import { sendApprovedEmail, sendInviteUserEmail } from "@heiso/core/lib/email";
import { generateInviteToken } from "@heiso/core/lib/id-generator";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MemberStatus, type Member } from "../types";

const isCoreMode = () => process.env.APP_MODE === "core";

/**
 * 取得團隊所有成員
 * Core 模式：使用 accounts 表
 * APPS 模式：使用 accounts 表 + FDW foreignAccounts（帳號基本資料）
 */
async function getTeamMembers(): Promise<Member[]> {
  const db = await getDynamicDb();

  // 統一從 accounts 表取得成員資格
  const accountList = await db.query.accounts.findMany({
    with: {
      customRole: true,
    },
    where: (t, { isNull }) => isNull(t.deletedAt),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  if (isCoreMode()) {
    // Core 模式：帳號資料已在 accounts 表
    return accountList.map(account => ({
      id: account.id,
      accountId: account.id,
      roleId: account.roleId,
      role: account.role as any,
      status: account.status as any,
      inviteToken: account.inviteToken,
      inviteExpiredAt: account.inviteExpiredAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      deletedAt: account.deletedAt,
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        active: account.active,
        lastLoginAt: account.lastLoginAt,
      } as any,
      // @ts-ignore - customRole 與 role 名稱衝突
      customRole: account.customRole ?? null,
    })) as Member[];
  } else {
    // APPS 模式：從 foreignAccounts 取得帳號基本資料
    const accountIds = accountList.map(a => a.id);
    const foreignAccountsData = accountIds.length > 0
      ? await db
        .select()
        .from(foreignAccounts)
        .where(
          accountIds.length === 1
            ? eq(foreignAccounts.id, accountIds[0])
            : eq(foreignAccounts.id, accountIds[0]) // TODO: use inArray when needed
        )
      : [];

    const foreignAccountMap = new Map(foreignAccountsData.map(a => [a.id, a]));

    return accountList.map(account => {
      const foreignAccount = foreignAccountMap.get(account.id);
      return {
        id: account.id,
        accountId: account.id,
        roleId: account.roleId,
        role: account.role as any,
        status: account.status as any,
        inviteToken: account.inviteToken,
        inviteExpiredAt: account.inviteExpiredAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        deletedAt: account.deletedAt,
        account: foreignAccount ? {
          id: foreignAccount.id,
          email: foreignAccount.email,
          name: foreignAccount.name,
          avatar: foreignAccount.avatar,
          active: foreignAccount.active,
          lastLoginAt: foreignAccount.lastLoginAt,
        } : {
          id: account.id,
          email: account.email,
          name: account.name,
          avatar: account.avatar,
          active: account.active,
          lastLoginAt: account.lastLoginAt,
        },
        // @ts-ignore - customRole 與 role 名稱衝突
        customRole: account.customRole ?? null,
      };
    }) as Member[];
  }
}

/**
 * 邀請新成員
 * 統一使用 accounts 表
 */
async function invite({
  email,
  name,
  roleId,
  accountId: providedAccountId,
}: {
  email?: string;
  name?: string;
  roleId?: string | null;
  accountId?: string;
}) {
  const db = await getDynamicDb();
  const inviteToken = generateInviteToken();
  const inviteExpiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  if (!email && !providedAccountId) {
    throw new Error("EMAIL_OR_ACCOUNT_ID_REQUIRED");
  }

  // 如果提供了 accountId，使用它；否則用 email 查找
  let accountId = providedAccountId;
  if (!accountId && email) {
    const existingAccount = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.email, email),
    });
    accountId = existingAccount?.id;
  }

  if (accountId) {
    // 已存在的帳號
    const existingAccount = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.id, accountId as string),
    });

    if (existingAccount) {
      if (existingAccount.deletedAt) {
        // 如果曾被刪除，則恢復
        await db
          .update(accounts)
          .set({
            status: MemberStatus.Invited,
            roleId: roleId ?? null,
            inviteToken,
            inviteExpiredAt,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existingAccount.id));
      } else if (existingAccount.status === MemberStatus.Suspended) {
        // 如果曾被停用，則恢復為邀請狀態
        await db
          .update(accounts)
          .set({
            status: MemberStatus.Invited,
            roleId: roleId ?? null,
            inviteToken,
            inviteExpiredAt,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existingAccount.id));
      } else {
        throw new Error("MEMBER_EXISTS");
      }

      if (email) {
        await sendInvite({ email, inviteToken, isOwner: false });
      }
      revalidatePath("/account/team", "page");
      return existingAccount;
    }
  }

  // 建立新帳號（僅 Core 模式支援直接建立）
  if (!email) throw new Error("EMAIL_REQUIRED");

  const { hashPassword } = await import("@heiso/core/lib/hash");
  const { generateId } = await import("@heiso/core/lib/id-generator");
  const randomPassword = await hashPassword(generateId(undefined, 32));

  const [created] = await db
    .insert(accounts)
    .values({
      email,
      name: name ?? email.split("@")[0],
      password: randomPassword,
      role: "member",
      roleId: roleId ?? null,
      status: MemberStatus.Invited,
      inviteToken,
      inviteExpiredAt,
      active: false,
    })
    .returning();

  await sendInvite({ email, inviteToken, isOwner: false });
  revalidatePath("/account/team", "page");
  return created;
}

/**
 * 更新成員資料
 * 統一使用 accounts 表
 */
async function updateMember({
  id,
  data,
}: {
  id: string;
  data: {
    role?: 'owner' | 'admin' | 'member';
    roleId?: string | null;
    status?: 'invited' | 'active' | 'inactive' | 'suspended';
  };
}) {
  const db = await getDynamicDb();

  const accountUpdates: Partial<typeof accounts.$inferInsert> = {
    ...data,
    updatedAt: new Date(),
  };

  const result = await db
    .update(accounts)
    .set(accountUpdates)
    .where(eq(accounts.id, id));

  revalidatePath("/account/team", "page");
  return result;
}

/**
 * 發送邀請 email
 */
async function sendInvite({
  email,
  inviteToken,
  isOwner,
}: {
  email: string;
  inviteToken: string;
  isOwner: boolean;
}) {
  const { NOTIFY_EMAIL } = await settings();
  const result = await sendInviteUserEmail({
    from: NOTIFY_EMAIL as string,
    to: [email],
    inviteToken,
    owner: isOwner,
  });
  return result;
}

/**
 * 發送核准通知 email
 */
async function sendApproved({ email }: { email: string }) {
  const { NOTIFY_EMAIL } = await settings();
  const result = await sendApprovedEmail({
    from: NOTIFY_EMAIL as string,
    to: [email],
  });
  return result;
}

/**
 * 重寄邀請
 * 統一使用 accounts 表
 */
async function resendInvite(id: string) {
  const db = await getDynamicDb();
  const inviteToken = generateInviteToken();
  const inviteExpiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const account = await db.query.accounts.findFirst({
    where: (t, { eq, isNull }) => and(eq(t.id, id), isNull(t.deletedAt)),
  });

  if (!account?.email) {
    throw new Error("Account not found");
  }

  await db
    .update(accounts)
    .set({
      inviteToken,
      inviteExpiredAt,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));

  const result = await sendInvite({
    email: account.email,
    inviteToken,
    isOwner: account.role === 'owner',
  });

  revalidatePath("/account/team", "page");
  return result;
}

/**
 * 撤銷邀請
 * 統一使用 accounts 表（軟刪除）
 */
async function revokeInvite(id: string) {
  const db = await getDynamicDb();

  await db
    .update(accounts)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(accounts.id, id));

  revalidatePath("/account/team", "page");
}

/**
 * 離開團隊
 * 統一使用 accounts 表（軟刪除）
 */
async function leaveTeam(id: string) {
  const db = await getDynamicDb();

  await db
    .update(accounts)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(accounts.id, id));

  revalidatePath("/account/team", "page");
}

/**
 * 新增成員（直接啟用，不需要邀請流程）
 * 統一使用 accounts 表
 */
async function addMember({
  email,
  roleId,
  initialPassword,
}: {
  email: string;
  roleId: string;
  initialPassword?: string;
}) {
  const db = await getDynamicDb();
  const { hashPassword } = await import("@heiso/core/lib/hash");

  const existingAccount = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  });

  if (existingAccount && !existingAccount.deletedAt) {
    throw new Error("Member already exists");
  }

  if (!initialPassword) {
    throw new Error("Initial password is required");
  }

  const hashedPassword = await hashPassword(initialPassword);
  const displayName = email.split("@")[0];

  if (existingAccount) {
    // 恢復已刪除的帳號
    const [updated] = await db
      .update(accounts)
      .set({
        password: hashedPassword,
        roleId,
        role: "member",
        status: "active",
        active: true,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, existingAccount.id))
      .returning();

    revalidatePath("/account/team", "page");
    return { member: updated };
  }

  const [account] = await db
    .insert(accounts)
    .values({
      email,
      name: displayName,
      password: hashedPassword,
      roleId,
      role: "member",
      status: "active",
      active: true,
    })
    .returning();

  revalidatePath("/account/team", "page");
  return { member: account };
}

/**
 * 轉移擁有權
 * 統一使用 accounts 表
 */
async function transferOwnership({
  newOwnerId,
  currentOwnerId,
}: {
  newOwnerId: string;
  currentOwnerId: string;
}) {
  const db = await getDynamicDb();
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // 查找當前擁有者
  const currentOwnerAccount = await db.query.accounts.findFirst({
    where: (t, { eq, and }) =>
      and(
        eq(t.id, currentOwnerId),
        eq(t.id, session.user.id!),
        eq(t.role, 'owner'),
      ),
  });

  if (!currentOwnerAccount) {
    throw new Error("Only current owner can transfer ownership");
  }

  // 查找新擁有者
  const newOwnerAccount = await db.query.accounts.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, newOwnerId), eq(t.status, "active")),
  });

  if (!newOwnerAccount) {
    throw new Error("Target account must be active");
  }

  await db.transaction(async (tx) => {
    // 設定新擁有者
    await tx
      .update(accounts)
      .set({
        role: 'owner',
        roleId: null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, newOwnerId));

    // 移除前擁有者權限（降為 admin）
    await tx
      .update(accounts)
      .set({
        role: 'admin',
        roleId: null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, currentOwnerId));
  });

  revalidatePath("/account/team");

  return { success: true };
}

/**
 * 重設成員密碼
 * 統一使用 accounts 表
 */
async function resetMemberPassword({
  actorMemberId,
  targetMemberId,
  newPassword,
}: {
  actorMemberId: string;
  targetMemberId: string;
  newPassword: string;
}) {
  const db = await getDynamicDb();
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const { hashPassword } = await import("@heiso/core/lib/hash");

  // 驗證操作者身份
  const actor = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.id, actorMemberId),
  });

  if (!actor) {
    return { success: false, error: "ACTOR_NOT_FOUND" };
  }
  if (actor.id !== session.user.id) {
    return { success: false, error: "UNAUTHORIZED" };
  }
  if (actor.role !== 'owner') {
    return { success: false, error: "PERMISSION_DENIED" };
  }

  // 取得目標帳號
  const target = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.id, targetMemberId),
  });

  if (!target) {
    return { success: false, error: "TARGET_NOT_FOUND" };
  }

  // 更新密碼
  const hashedPassword = await hashPassword(newPassword);
  await db
    .update(accounts)
    .set({
      password: hashedPassword,
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, targetMemberId));

  return { success: true };
}

export {
  getTeamMembers,
  invite,
  updateMember,
  sendApproved,
  sendInvite,
  resendInvite,
  revokeInvite,
  leaveTeam,
  addMember,
  transferOwnership,
  resetMemberPassword,
};
