import { defineConfig } from "drizzle-kit";

/**
 * 建立基礎 Drizzle 設定
 * @param options schema 與 out 路徑設定
 */
export function createDrizzleConfig(options: {
    schema: string;
    out?: string;
    dbCredentials?: {
        url: string;
    };
}) {
    return defineConfig({
        schema: options.schema,
        out: options.out ?? "./drizzle",
        dialect: "postgresql",
        dbCredentials: options.dbCredentials,
    });
}
