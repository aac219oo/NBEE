import {
  boolean,
  check,
  index,
  json,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type zod from "zod";

/**
 * settings 表
 *
 * 用於存放所有系統設定，用 group 區分用途：
 * - 'system': 後端系統設定（含 tenantId 識別、API key、OAuth 等）
 * - 'site': 前端網站設定（basic、branding、assets、SEO 等）
 *
 * 特殊設定：
 * - name='tenantId', group='system': 用於識別此 DB 所屬租戶
 */
export const settings = pgTable(
  "settings",
  {
    // 主鍵
    name: varchar("name", { length: 100 }).notNull().primaryKey(),

    // 值
    value: json("value").notNull(),

    // 分組與元資料
    group: varchar("group", { length: 50 }).notNull().default("system"),
    description: varchar("description", { length: 255 }),
    isKey: boolean("is_key").notNull().default(false),

    // Timestamps
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("settings_group_idx").on(table.group),
    index("settings_is_key_idx").on(table.isKey),
    index("settings_deleted_at_idx").on(table.deletedAt),
    check("settings_group_check", sql`${table.group} IN ('system', 'site')`),
  ],
);

export const settingsSchema = createSelectSchema(settings);
export const settingsInsertSchema = createInsertSchema(settings);
export const settingsUpdateSchema = createUpdateSchema(settings);

export type TSettings = zod.infer<typeof settingsSchema>;
export type TSettingsInsert = zod.infer<typeof settingsInsertSchema>;
export type TSettingsUpdate = zod.infer<typeof settingsUpdateSchema>;
