import { generateId } from "@heiso/core/lib/id-generator";
import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type zod from "zod";
import { roles } from "./role";
import { type Role, type MemberStatus } from "@heiso/core/types/member";

/**
 * members 表 - 租戶成員資格
 *
 * 關聯到 Platform.accounts (透過 FDW)
 * 已移除冗餘欄位 (email, loginMethod)
 */
export const members = pgTable(
  "members",
  {
    id: varchar("id", { length: 20 })
      .primaryKey()
      .$default(() => generateId()),

    // 關聯到 Platform.accounts (透過 FDW)
    // TODO: 資料遷移後改回 .notNull()
    accountId: varchar("account_id", { length: 50 }),

    // 系統角色 (owner/admin/member)
    role: varchar("role", { length: 20 })
      .notNull()
      .default("member")
      .$type<Role>(),

    // member 自訂權限角色 (可選，用於額外的細粒度權限控制)
    roleId: varchar("role_id", { length: 20 }).references(() => roles.id),

    // 成員狀態
    status: varchar("status", { length: 20 })
      .notNull()
      .default("invited")
      .$type<MemberStatus>(),

    // 邀請相關
    inviteToken: varchar("invite_token", { length: 50 }),
    inviteExpiredAt: timestamp("invite_expired_at"),

    // Timestamps
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("members_account_id_idx").on(table.accountId),
    index("members_role_idx").on(table.role),
    index("members_role_id_idx").on(table.roleId),
    index("members_status_idx").on(table.status),
    index("members_invite_token_idx").on(table.inviteToken),
  ],
);

export const membersRelations = relations(members, ({ one }) => ({
  role: one(roles, {
    fields: [members.roleId],
    references: [roles.id],
  }),
}));

export const membersSchema = createSelectSchema(members);
export const membersInsertSchema = createInsertSchema(members);
export const membersUpdateSchema = createUpdateSchema(members);

export type TMember = zod.infer<typeof membersSchema>;
export type TMemberInsert = zod.infer<typeof membersInsertSchema>;
export type TMemberUpdate = zod.infer<typeof membersUpdateSchema>;
