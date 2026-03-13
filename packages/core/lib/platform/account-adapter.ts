"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import type { TAccount } from "@heiso/core/lib/db/schema/auth/accounts";
import { accounts } from "@heiso/core/lib/db/schema/auth/accounts";
import { eq } from "drizzle-orm";
import { getPlatformAccountAdapter } from "@heiso/core/lib/adapters";

/**
 * Account Adapter - 根據 APP_MODE 切換帳號資料來源
 *
 * - APP_MODE=core: 使用本地 accounts 表
 * - APP_MODE=cms: 使用本地 accounts 表（與 Core 相同）
 *
 * 註：CMS 模式若需要連接 Platform DB，使用 Platform Adapter
 */

const isCmsWithPlatform = () =>
  process.env.APP_MODE === "cms" && !!getPlatformAccountAdapter();

/**
 * 取得帳號 by Email
 */
export async function getAccountByEmail(
  email: string,
): Promise<TAccount | null> {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  });
  return account || null;
}

/**
 * 取得帳號 by ID
 */
export async function getAccountById(id: string): Promise<TAccount | null> {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  return account || null;
}

/**
 * 建立帳號
 */
export async function createAccount(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
  status?: string;
}): Promise<TAccount> {
  const db = await getDynamicDb();

  if (isCmsWithPlatform()) {
    // CMS 模式且有 Platform Adapter：同時寫入 Platform DB
    const adapter = getPlatformAccountAdapter()!;

    const result = await adapter.createAccount({
      email: data.email,
      name: data.name,
      password: data.password,
      active: true,
    });

    // 同時寫入本地 accounts 表
    const [account] = await db
      .insert(accounts)
      .values({
        id: result.id, // 使用 Platform 回傳的 ID
        email: data.email,
        name: data.name,
        password: data.password,
        role: (data.role as any) || "member",
        status: (data.status as any) || "pending",
        active: true,
      })
      .returning();

    return account;
  } else {
    // Core 模式或無 Platform Adapter：直接寫入本地
    const [account] = await db
      .insert(accounts)
      .values({
        email: data.email,
        name: data.name,
        password: data.password,
        role: (data.role as any) || "member",
        status: (data.status as any) || "pending",
        active: true,
      })
      .returning();

    return account;
  }
}

/**
 * 更新帳號
 */
export async function updateAccount(
  id: string,
  data: Partial<TAccount>,
): Promise<void> {
  const db = await getDynamicDb();

  if (isCmsWithPlatform()) {
    // CMS 模式且有 Platform Adapter：同時更新 Platform DB
    const adapter = getPlatformAccountAdapter()!;

    await adapter.updateAccount(id, {
      name: data.name,
      avatar: data.avatar ?? undefined,
      email: data.email,
      active: data.active,
    });
  }

  // 更新本地 accounts 表
  await db
    .update(accounts)
    .set(data as any)
    .where(eq(accounts.id, id));
}

/**
 * 驗證密碼
 */
export async function verifyPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const db = await getDynamicDb();

  const account = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.email, email),
    columns: { password: true },
  });

  if (!account) return false;

  const { verifyPassword: verifyHash } = await import("@heiso/core/lib/hash");
  return await verifyHash(password, account.password);
}

/**
 * 檢查是否有任何帳號
 */
export async function hasAnyAccount(): Promise<boolean> {
  const db = await getDynamicDb();

  const first = await db.query.accounts.findFirst({
    columns: { id: true },
  });
  return !!first;
}
