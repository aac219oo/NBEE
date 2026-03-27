import type { TRole } from "@heiso/core/lib/db/schema";

export enum MemberStatus {
  Invited = "invited",
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
}

/**
 * 帳號基本資料（用於 Member.account）
 */
export interface MemberAccount {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  active: boolean;
  lastLoginAt: Date | null;
}

/**
 * 成員類型（整合帳號與角色資訊）
 *
 * 此類型用於團隊成員列表 UI
 * 資料來自 Tenant DB accounts 表
 */
export interface Member {
  id: string;
  accountId: string;
  roleId: string | null;
  role: "owner" | "admin" | "member";
  status: "invited" | "active" | "inactive" | "suspended";
  inviteToken: string | null;
  inviteExpiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  account: MemberAccount;
  customRole: TRole | null;
}
