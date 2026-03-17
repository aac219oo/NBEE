import { generateAccountId } from "@heiso/core/lib/id-generator";
import { relations } from "drizzle-orm";
import {
  boolean,
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
import { roles } from "../permissions/role";
import { type Role, type MemberStatus } from "@heiso/core/types/member";

/**
 * accounts 表 - 整合帳號與成員資料
 *
 * Core 模式：作為主要的使用者與成員資料來源（帳號 + 成員關係）
 * APPS 模式：
 *   - 帳號基本資料（email, name, avatar）：從 foreignAccounts (FDW) 讀取
 *   - 成員關係資料（role, status, inviteToken）：使用此表
 *
 * 此表合併了原本的 users 和 members 功能
 */
export const accounts = pgTable(
  "accounts",
  {
    id: varchar("id", { length: 50 })
      .primaryKey()
      .$default(() => generateAccountId()),

    // === 帳號資訊 ===
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    avatar: varchar("avatar", { length: 255 }),

    // 帳號狀態
    active: boolean("active").notNull().default(true),

    // 登入相關
    lastLoginAt: timestamp("last_login_at"),
    loginMethod: varchar("login_method", { length: 20 }).default("password"),

    // 2FA
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    twoFactorSecret: varchar("two_factor_secret", { length: 255 }),

    // 密碼管理
    mustChangePassword: boolean("must_change_password").default(false),

    // === 成員資格 ===
    // 系統角色 (owner/admin/member)
    role: varchar("role", { length: 20 })
      .notNull()
      .default("member")
      .$type<Role>(),

    // 自訂權限角色（可選）
    roleId: varchar("role_id", { length: 20 }).references(() => roles.id),

    // 成員狀態 (active/suspended/pending)
    status: varchar("status", { length: 20 })
      .notNull()
      .default("pending")
      .$type<MemberStatus>(),

    // === 邀請相關 ===
    inviteToken: varchar("invite_token", { length: 50 }),
    inviteExpiredAt: timestamp("invite_expired_at"),
    invitedBy: varchar("invited_by", { length: 50 }),

    // 加入時間
    joinedAt: timestamp("joined_at"),

    // === 時間戳記 ===
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("accounts_email_idx").on(table.email),
    index("accounts_role_idx").on(table.role),
    index("accounts_status_idx").on(table.status),
    index("accounts_invite_token_idx").on(table.inviteToken),
    index("accounts_last_login_idx").on(table.lastLoginAt),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  customRole: one(roles, {
    fields: [accounts.roleId],
    references: [roles.id],
  }),
}));

export const accountsSchema = createSelectSchema(accounts);
export const accountsInsertSchema = createInsertSchema(accounts);
export const accountsUpdateSchema = createUpdateSchema(accounts);

export type TAccount = zod.infer<typeof accountsSchema>;
export type TAccountInsert = zod.infer<typeof accountsInsertSchema>;
export type TAccountUpdate = zod.infer<typeof accountsUpdateSchema>;
