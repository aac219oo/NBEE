"use server";

import {
  getAccountByEmail as getAccountByEmailAdapter,
  getAccountById,
  updateAccount,
} from "@heiso/core/lib/platform/account-adapter";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import type { TAccount } from "@heiso/core/lib/db/schema";

// Re-export adapter functions
export { getAccountByEmailAdapter as getAccountByEmail };

/**
 * Get all accounts
 * Core mode: From accounts table
 * CMS mode: From foreignAccounts (FDW) + members
 */
export async function getUsers() {
  const db = await getDynamicDb();

  if (process.env.APP_MODE === "core") {
    // Core 模式：直接查詢 accounts 表
    return await db.query.accounts.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } else {
    // APPS 模式：使用 FDW
    // @ts-ignore - foreignAccounts Drizzle query type issue
    const accounts = await db.query.foreignAccounts.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return accounts;
  }
}

export async function getUserById(id: string) {
  return await getAccountById(id);
}

export async function getInvitation(token: string) {
  const db = await getDynamicDb();
  const invitation = await db.query.members.findFirst({
    columns: {
      id: true,
      accountId: true,
    },
    where: (table, { eq }) => eq(table.inviteToken, token),
  });

  if (!invitation || !invitation.accountId)
    return {
      invitation: null,
      user: null,
    };

  const user = await getAccountById(invitation.accountId);
  return {
    invitation,
    user,
  };
}

export async function getAccount(id: string) {
  return await getAccountById(id);
}

export async function getUser(email: string) {
  return await getAccountByEmailAdapter(email);
}

/**
 * Update account
 * Core mode: Update accounts table
 * CMS mode: Requires Platform API
 */
export async function update(id: string, data: Partial<TAccount>) {
  try {
    await updateAccount(id, data);
  } catch (error) {
    console.error("Failed to update account:", error);
    throw error;
  }
}
