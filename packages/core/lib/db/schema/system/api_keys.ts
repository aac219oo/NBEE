import { generateId } from "@heiso/core/lib/id-generator";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { foreignAccounts } from "../foreign/accounts";

// API Keys table
export const apiKeys = pgTable(
  "api_keys",
  {
    id: varchar("id", { length: 20 })
      .primaryKey()
      .$defaultFn(() => generateId()),
    // TODO: 資料遷移後改回 .notNull()
    accountId: varchar("account_id", { length: 50 }),
    name: varchar("name", { length: 100 }).notNull(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    truncatedKey: varchar("truncated_key", { length: 30 }),
    rateLimit: json("rate_limit").default({ requests: 100, window: 60 }),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("api_keys_account_id_idx").on(table.accountId),
    index("api_keys_key_idx").on(table.key),
  ],
);

// API Key access log table
export const apiKeyAccessLogs = pgTable(
  "api_key_access_logs",
  {
    id: varchar("id", { length: 20 })
      .primaryKey()
      .$defaultFn(() => generateId()),
    apiKeyId: varchar("api_key_id", { length: 20 })
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    // TODO: 資料遷移後改回 .notNull()
    accountId: varchar("account_id", { length: 50 }),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    method: varchar("method", { length: 10 }).notNull(),
    statusCode: integer("status_code").notNull(),
    responseTime: integer("response_time").notNull(), // in milliseconds
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("api_key_access_logs_api_key_id_idx").on(table.apiKeyId),
    index("api_key_access_logs_account_id_idx").on(table.accountId),
  ],
);

// Relations for access logs
export const apiKeyAccessLogsRelations = relations(
  apiKeyAccessLogs,
  ({ one }) => ({
    apiKey: one(apiKeys, {
      fields: [apiKeyAccessLogs.apiKeyId],
      references: [apiKeys.id],
    }),
  }),
);

// Relations
export const apiKeysRelations = relations(apiKeys, ({ many }) => ({
  accessLogs: many(apiKeyAccessLogs),
}));

// Types
export type TApiKey = typeof apiKeys.$inferSelect;
export type TInsertApiKey = typeof apiKeys.$inferInsert;

// Create API Key data type (without sensitive fields)
export type TCreateApiKey = Omit<
  TInsertApiKey,
  "id" | "accountId" | "key" | "createdAt" | "updatedAt" | "deletedAt"
>;
export type TUpdateApiKey = Partial<
  Pick<TApiKey, "name" | "expiresAt">
>;

// Public API Key type (without sensitive key field)
export type TPublicApiKey = Omit<TApiKey, "key" | "deletedAt">;

// Access log types
export type TApiKeyAccessLog = typeof apiKeyAccessLogs.$inferSelect;
export type TInsertApiKeyAccessLog = typeof apiKeyAccessLogs.$inferInsert;
