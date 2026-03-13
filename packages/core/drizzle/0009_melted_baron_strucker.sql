ALTER TABLE "api_key_access_logs" RENAME COLUMN "user_id" TO "account_id";--> statement-breakpoint
ALTER TABLE "api_keys" RENAME COLUMN "user_id" TO "account_id";--> statement-breakpoint
ALTER TABLE "api_key_access_logs" DROP CONSTRAINT "api_key_access_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "api_key_access_logs_user_id_idx";--> statement-breakpoint
DROP INDEX "api_keys_user_id_idx";--> statement-breakpoint
CREATE INDEX "api_key_access_logs_account_id_idx" ON "api_key_access_logs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "api_keys_account_id_idx" ON "api_keys" USING btree ("account_id");