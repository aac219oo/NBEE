"use server";

/**
 * Developer 服務
 *
 * 注意：developers 表已遷移至 Platform DB 的 platformRoles
 * 這些操作需要透過 Platform API 實現
 *
 * Platform 角色類型：
 * - 'root': 擁有控制平面 (Hive) 的絕對權限
 * - 'developer': 負責 App Catalog 與系統擴展開發
 * - 'user': 一般使用者（僅用於 SSO 登入）
 */

import type { TForeignAccount } from "@heiso/core/lib/db/schema";

type Developer = {
  accountId: string;
  role: string;
  createdAt: Date;
  user: TForeignAccount;
};

/**
 * @deprecated Use Platform API to manage platform roles
 */
async function getDevelopers(): Promise<Developer[]> {
  console.warn("[getDevelopers] Requires Platform API implementation");
  // TODO: 呼叫 Platform API 取得 platformRoles where role = 'developer'
  return [];
}

/**
 * @deprecated Use Platform API to manage platform roles
 */
async function addDeveloper({ email }: { email: string }): Promise<{ accountId: string }> {
  console.warn("[addDeveloper] Requires Platform API implementation");
  // TODO: 呼叫 Platform API 新增 platformRole
  throw new Error("Adding developer requires Platform API implementation");
}

/**
 * @deprecated Use Platform API to manage platform roles
 */
async function removeDeveloper({ id }: { id: string }): Promise<{ accountId: string }> {
  console.warn("[removeDeveloper] Requires Platform API implementation");
  // TODO: 呼叫 Platform API 移除 platformRole
  throw new Error("Removing developer requires Platform API implementation");
}

export { getDevelopers, addDeveloper, removeDeveloper, type Developer };
