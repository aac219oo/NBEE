import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const coreUrl = process.env.DATABASE_URL;
  const hiveUrl = process.env.HIVE_DATABASE_URL;

  if (!coreUrl || !hiveUrl) {
    console.error("Missing DATABASE_URL or HIVE_DATABASE_URL in .env");
    process.exit(1);
  }

  const url = new URL(hiveUrl);
  const host = url.hostname;
  const port = url.port || "5432";
  const dbname = url.pathname.slice(1);
  const user = url.username;
  const password = url.password;

  const client = postgres(coreUrl);
  const db = drizzle(client);

  console.log("Setting up FDW on Tenant DB...");
  
  // Create extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgres_fdw;`);
  
  // Drop server if exists to easily update credentials
  await db.execute(sql`DROP SERVER IF EXISTS hive_server CASCADE;`);

  // Create server
  await db.execute(sql.raw(`
    CREATE SERVER hive_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host '${host}', dbname '${dbname}', port '${port}');
  `));

  // Create user mapping
  await db.execute(sql.raw(`
    CREATE USER MAPPING FOR current_user
    SERVER hive_server
    OPTIONS (user '${user}', password '${password}');
  `));

  // Import foreign table
  await db.execute(sql`
    DROP FOREIGN TABLE IF EXISTS foreign_accounts;
    IMPORT FOREIGN SCHEMA public LIMIT TO (accounts) FROM SERVER hive_server INTO public;
    ALTER FOREIGN TABLE accounts RENAME TO foreign_accounts;
  `);

  console.log("✅ FDW foreign_accounts table successfully created in Tenant DB.");
  process.exit(0);
}

main().catch((err) => {
  console.error("FDW Setup Failed:", err);
  process.exit(1);
});
