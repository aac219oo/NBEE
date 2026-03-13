import type { TMember, TRole } from "@heiso/core/lib/db/schema";
import type { foreignAccounts } from "@heiso/core/lib/db/schema";

export enum MemberStatus {
  Invited = "invited",
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
}

/**
 * 成員類型（包含帳號資訊和角色）
 */
export type Member = TMember & {
  account: typeof foreignAccounts.$inferSelect | null;
  role: TRole | null;
};
