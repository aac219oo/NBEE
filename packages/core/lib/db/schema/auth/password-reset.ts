import { generateId } from "@heiso/core/lib/id-generator";
import {
  boolean,
  index,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * userPasswordReset - 密碼重設 token
 *
 * accountId 關聯到 Platform.accounts (透過 FDW)
 */
export const userPasswordReset = pgTable(
  "user_password_reset",
  {
    id: varchar("id", { length: 20 })
      .primaryKey()
      .$default(() => generateId()),
    // TODO: 資料遷移後改回 .notNull()
    accountId: varchar("account_id", { length: 50 }),
    token: varchar("token", { length: 100 }).notNull(),
    used: boolean("used").default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("user_password_reset_account_id_idx").on(table.accountId),
    index("user_password_reset_valid_idx").on(table.used, table.expiresAt),
    index("user_password_reset_token_idx").on(table.token),
  ],
);
