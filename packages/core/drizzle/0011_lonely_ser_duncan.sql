CREATE TABLE "accounts" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"avatar" varchar(255),
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"login_method" varchar(20) DEFAULT 'email',
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar(255),
	"must_change_password" boolean DEFAULT false,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"role_id" varchar(20),
	"status" varchar(20) DEFAULT 'invited' NOT NULL,
	"invite_token" varchar(50),
	"invite_expired_at" timestamp,
	"invited_by" varchar(50),
	"joined_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "accounts_role_check" CHECK ("accounts"."role" IN ('owner', 'admin', 'member')),
	CONSTRAINT "accounts_status_check" CHECK ("accounts"."status" IN ('invited', 'active', 'inactive', 'suspended')),
	CONSTRAINT "accounts_login_method_check" CHECK ("accounts"."login_method" IN ('both', 'otp', 'email', 'sso'))
);
--> statement-breakpoint
ALTER TABLE "developers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "developers" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
DROP TABLE "members" CASCADE;--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "page_categories" DROP CONSTRAINT "page_categories_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "page_templates" DROP CONSTRAINT "page_templates_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pages" DROP CONSTRAINT "pages_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pages" DROP CONSTRAINT "pages_updater_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_2fa_code" ALTER COLUMN "account_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "user_password_reset" ALTER COLUMN "account_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "owner_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "navigations" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "page_categories" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "page_templates" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "updater" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "api_key_access_logs" ALTER COLUMN "account_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "account_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "foreign_accounts" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "truncated_key" varchar(30);--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_email_idx" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "accounts_role_idx" ON "accounts" USING btree ("role");--> statement-breakpoint
CREATE INDEX "accounts_status_idx" ON "accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "accounts_invite_token_idx" ON "accounts" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "accounts_last_login_idx" ON "accounts" USING btree ("last_login_at");--> statement-breakpoint
ALTER TABLE "navigation_menus" ADD CONSTRAINT "navigation_menus_link_type_check" CHECK ("navigation_menus"."link_type" IN ('none', 'link', 'pages', 'articles'));--> statement-breakpoint
ALTER TABLE "navigation_menus" ADD CONSTRAINT "navigation_menus_style_check" CHECK ("navigation_menus"."style" IN ('none', 'button'));--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_group_check" CHECK ("settings"."group" IN ('system', 'general', 'site'));