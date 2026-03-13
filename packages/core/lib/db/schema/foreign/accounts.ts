import { pgTable, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * foreignAccounts - Foreign table 映射 (只讀)
 *
 * 對應 Platform DB 的 accounts 表
 * 透過 Supabase FDW 連接
 *
 * 注意: 這是 foreign table，不能 INSERT/UPDATE/DELETE
 * 只能用於 SELECT 和 JOIN
 */
export const foreignAccounts = pgTable("foreign_accounts", {
  id: varchar("id", { length: 50 }).primaryKey(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 100 }),
  avatar: varchar("avatar", { length: 255 }),
  active: boolean("active"),
  twoFactorEnabled: boolean("two_factor_enabled"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export type TForeignAccount = typeof foreignAccounts.$inferSelect;
