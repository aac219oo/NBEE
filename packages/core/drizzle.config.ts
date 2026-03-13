import "dotenv-flow/config";
import { createDrizzleConfig } from "@heiso/drizzle-config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default createDrizzleConfig({
  out: "./drizzle",
  schema: "./lib/db/schema/index.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
