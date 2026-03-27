ALTER TABLE "foreign_accounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "foreign_accounts" CASCADE;--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_role_check";--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_group_check";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "group" SET DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "group" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_role_check" CHECK ("accounts"."role" IN ('owner', 'member'));--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_group_check" CHECK ("settings"."group" IN ('system', 'site'));