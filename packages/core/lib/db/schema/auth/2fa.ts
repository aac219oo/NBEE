import { generateId } from "@heiso/core/lib/id-generator";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * user2faCode - 2FA 驗證碼
 *
 * accountId 關聯到 Platform.accounts (透過 FDW)
 */
export const user2faCode = pgTable(
  "user_2fa_code",
  {
    id: varchar("id", { length: 20 })
      .primaryKey()
      .$default(() => generateId()),
    // TODO: 資料遷移後改回 .notNull()
    accountId: varchar("account_id", { length: 50 }),
    code: text("code").notNull(),
    used: boolean("used").default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("user_2fa_code_account_id_idx").on(table.accountId),
    index("user_2fa_code_valid_idx").on(table.used, table.expiresAt),
  ],
);
