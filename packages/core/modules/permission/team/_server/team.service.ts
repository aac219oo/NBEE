"use server";

import { settings } from "@heiso/core/config/settings";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { members, foreignAccounts, accounts } from "@heiso/core/lib/db/schema";
import { sendApprovedEmail, sendInviteUserEmail } from "@heiso/core/lib/email";
import { generateInviteToken } from "@heiso/core/lib/id-generator";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { eq, inArray, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MemberStatus, type Member } from "../types";

const isCoreMode = () => process.env.APP_MODE === "core";

/**
 * 取得團隊所有成員
 * Core 模式：使用 accounts 表
 * APPS 模式：使用 members 表 + FDW foreignAccounts
 */
async function getTeamMembers(): Promise<Member[]> {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：直接從 accounts 表取得
    const accountList = await db.query.accounts.findMany({
      with: {
        customRole: true,
      },
      where: (t, { isNull }) => isNull(t.deletedAt),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });

    // 轉換為 Member 格式
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
      role: account.customRole ?? null,
    })) as Member[];
  } else {
    // APPS 模式：使用 members 表 + FDW
    const memberList = await db.query.members.findMany({
      with: {
        role: true,
      },
      where: (t, { isNull }) => isNull(t.deletedAt),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });

    // 批次取得帳號資訊 (透過 FDW)
    const accountIds = memberList.map(m => m.accountId).filter((id): id is string => id !== null);
    const accountsData = accountIds.length > 0
      ? await db
        .select()
        .from(foreignAccounts)
        .where(
          // @ts-ignore - drizzle inArray type issue
          accountIds.length === 1
            ? eq(foreignAccounts.id, accountIds[0])
            : inArray(foreignAccounts.id, accountIds)
        )
      : [];

    const accountMap = new Map(accountsData.map(a => [a.id, a]));

    return memberList.map(member => ({
      ...member,
      account: member.accountId ? accountMap.get(member.accountId) ?? null : null,
      role: member.role ?? null,
    }));
  }
}

/**
 * 邀請新成員
 * Core 模式：直接在 accounts 表建立帳號
 * APPS 模式：透過 Hive 服務查找或建立帳號，再建立 members 記錄
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

  if (isCoreMode()) {
    // Core 模式：直接在 accounts 表建立或更新
    if (!email) throw new Error("EMAIL_REQUIRED");

    // 檢查是否已存在此 email 的帳號
    const existingAccount = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.email, email),
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

      await sendInvite({ email, inviteToken, isOwner: false });
      revalidatePath("/account/team", "page");
      return existingAccount;
    }

    // 建立新帳號
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
  } else {
    // APPS 模式：透過 Platform Adapter
    let accountId = providedAccountId;
    if (!accountId) {
      if (!email) throw new Error("EMAIL_OR_ACCOUNT_ID_REQUIRED");
      const { getPlatformAccountAdapter } = await import("@heiso/core/lib/adapters");
      const adapter = getPlatformAccountAdapter();
      if (!adapter) {
        throw new Error("PlatformAccountAdapter not registered");
      }
      accountId = await adapter.getAccountWithCreate({ email, name });
    }

    // 檢查是否已存在此帳號的成員
    const existingMember = await db.query.members.findFirst({
      where: (t, { and, eq, isNull }) =>
        and(eq(t.accountId, accountId as string), isNull(t.deletedAt)),
    });

    if (existingMember) {
      if (existingMember.status === MemberStatus.Suspended) {
        // 如果曾被停用，則恢復為邀請狀態
        await db
          .update(members)
          .set({
            status: MemberStatus.Invited,
            roleId,
            inviteToken,
            inviteExpiredAt,
            updatedAt: new Date(),
          })
          .where(eq(members.id, existingMember.id));
        revalidatePath("/account/team", "page");
        return;
      }
      throw new Error("MEMBER_EXISTS");
    }

    const [created] = await db
      .insert(members)
      .values({
        accountId: accountId as string,
        roleId: roleId ?? null,
        role: 'member',
        status: MemberStatus.Invited,
        inviteToken,
        inviteExpiredAt,
      })
      .returning();

    if (created && email) {
      await sendInvite({ email, inviteToken, isOwner: false });
      revalidatePath("/account/team", "page");
    }

    return created;
  }
}

/**
 * 更新成員資料
 * Core 模式：更新 accounts 表
 * APPS 模式：更新 members 表
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

  if (isCoreMode()) {
    // Core 模式：更新 accounts 表
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
  } else {
    // APPS 模式：更新 members 表
    const memberUpdates: Partial<typeof members.$inferInsert> = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(members)
      .set(memberUpdates)
      .where(eq(members.id, id));

    revalidatePath("/account/team", "page");
    return result;
  }
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
 * Core 模式：更新 accounts 表
 * APPS 模式：更新 members 表
 */
async function resendInvite(id: string) {
  const db = await getDynamicDb();
  const inviteToken = generateInviteToken();
  const inviteExpiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  if (isCoreMode()) {
    // Core 模式：直接從 accounts 表取得
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
  } else {
    // APPS 模式：使用 members 表 + FDW
    const member = await db.query.members.findFirst({
      where: (t, { eq, and, isNull }) =>
        and(eq(t.id, id), isNull(t.deletedAt)),
    });

    if (!member || !member.accountId) {
      throw new Error("Member not found");
    }

    // 取得帳號 email (透過 FDW)
    const [account] = await db
      .select()
      .from(foreignAccounts)
      .where(eq(foreignAccounts.id, member.accountId))
      .limit(1);

    if (!account?.email) {
      throw new Error("Account not found");
    }

    await db
      .update(members)
      .set({
        inviteToken,
        inviteExpiredAt,
        updatedAt: new Date(),
      })
      .where(eq(members.id, id));

    const result = await sendInvite({
      email: account.email,
      inviteToken,
      isOwner: member.role === 'owner',
    });

    revalidatePath("/account/team", "page");
    return result;
  }
}

/**
 * 撤銷邀請
 * Core 模式：軟刪除 accounts 記錄
 * APPS 模式：刪除 members 記錄
 */
async function revokeInvite(id: string) {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：軟刪除 accounts
    await db
      .update(accounts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(accounts.id, id));
  } else {
    // APPS 模式：刪除 members
    await db.delete(members).where(eq(members.id, id));
  }

  revalidatePath("/account/team", "page");
}

/**
 * 離開團隊
 * Core 模式：軟刪除 accounts 記錄
 * APPS 模式：刪除 members 記錄
 */
async function leaveTeam(id: string) {
  const db = await getDynamicDb();

  if (isCoreMode()) {
    // Core 模式：軟刪除 accounts
    await db
      .update(accounts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(accounts.id, id));
  } else {
    // APPS 模式：刪除 members
    await db.delete(members).where(eq(members.id, id));
  }

  revalidatePath("/account/team", "page");
}

/**
 * 新增成員（直接啟用，不需要邀請流程）
 * Core 模式：直接在 accounts 表建立帳號
 * APPS 模式：透過 Hive 服務建立帳號，再建立 members 記錄
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

  if (isCoreMode()) {
    // Core 模式：直接在 accounts 表建立
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
  } else {
    // APPS 模式：透過 Platform Adapter
    const { getPlatformAccountAdapter } = await import("@heiso/core/lib/adapters");
    const adapter = getPlatformAccountAdapter();
    if (!adapter) {
      throw new Error("PlatformAccountAdapter not registered");
    }

    let account = await adapter.getAccountByEmail(email);

    if (!account && initialPassword) {
      const hashedPassword = await hashPassword(initialPassword);
      const displayName = email.split("@")[0];
      account = await adapter.createDevAccount(email, hashedPassword, displayName);
    }

    if (!account) {
      throw new Error("Account not found and cannot be created without initial password");
    }

    // 檢查成員是否已存在
    const existingMember = await db.query.members.findFirst({
      where: (t, { eq, isNull, and }) =>
        and(eq(t.accountId, account.id), isNull(t.deletedAt)),
    });

    if (existingMember) {
      throw new Error("Member already exists");
    }

    // 建立成員記錄
    const [member] = await db
      .insert(members)
      .values({
        accountId: account.id,
        roleId,
        role: 'member',
        status: "active",
      })
      .returning();

    revalidatePath("/account/team", "page");
    return { member };
  }
}

/**
 * 轉移擁有權
 * Core 模式：更新 accounts 表
 * APPS 模式：更新 members 表
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

  if (isCoreMode()) {
    // Core 模式：直接更新 accounts 表
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
  } else {
    // APPS 模式：更新 members 表
    // 查找當前擁有者（透過 session 的 accountId 驗證）
    const currentOwnerMember = await db.query.members.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, currentOwnerId),
          eq(t.accountId, session.user.id!),
          eq(t.role, 'owner'),
        ),
    });

    if (!currentOwnerMember) {
      throw new Error("Only current owner can transfer ownership");
    }

    // 查找新擁有者
    const newOwnerMember = await db.query.members.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.id, newOwnerId), eq(t.status, "active")),
    });

    if (!newOwnerMember) {
      throw new Error("Target member must be joined and active");
    }

    await db.transaction(async (tx) => {
      // 設定新擁有者
      await tx
        .update(members)
        .set({
          role: 'owner',
          roleId: null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, newOwnerId));

      // 移除前擁有者權限（降為 admin）
      await tx
        .update(members)
        .set({
          role: 'admin',
          roleId: null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, currentOwnerId));
    });
  }

  revalidatePath("/account/team");

  return { success: true };
}

/**
 * 重設成員密碼
 * Core 模式：直接更新 accounts 表
 * APPS 模式：需要 Platform API 支援
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

  if (isCoreMode()) {
    // Core 模式：直接驗證並更新 accounts 表
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
  } else {
    // APPS 模式：驗證並呼叫 Hive 服務
    // 驗證操作者身份
    const actor = await db.query.members.findFirst({
      where: (t, { eq }) => eq(t.id, actorMemberId),
    });

    if (!actor) {
      return { success: false, error: "ACTOR_MEMBER_NOT_FOUND" };
    }
    if (actor.accountId !== session.user.id) {
      return { success: false, error: "UNAUTHORIZED" };
    }
    if (actor.role !== 'owner') {
      return { success: false, error: "PERMISSION_DENIED" };
    }

    // 取得目標成員
    const target = await db.query.members.findFirst({
      where: (t, { eq }) => eq(t.id, targetMemberId),
    });

    if (!target || !target.accountId) {
      return { success: false, error: "MEMBER_NOT_FOUND" };
    }

    // 透過 Platform Adapter 更新密碼
    const { getPlatformAccountAdapter } = await import("@heiso/core/lib/adapters");
    const adapter = getPlatformAccountAdapter();
    if (!adapter) {
      return { success: false, error: "PLATFORM_ADAPTER_NOT_REGISTERED" };
    }
    const hashedPassword = await hashPassword(newPassword);
    await adapter.updatePassword(target.accountId, hashedPassword, true);

    return { success: true };
  }
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
