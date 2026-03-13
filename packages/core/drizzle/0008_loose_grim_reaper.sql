CREATE TABLE "page_categories" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "page_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "page_category_relations" (
	"post_id" varchar NOT NULL,
	"category_id" varchar NOT NULL,
	CONSTRAINT "page_category_relations_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "page_templates" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"page_id" varchar(20),
	"thumbnail" varchar(255),
	"html_content" json,
	"mobile_content" json,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255),
	"excerpt" text,
	"featured_image" varchar(255),
	"featured_video" varchar(255),
	"content" json,
	"html" text,
	"content_mobile" json,
	"html_mobile" text,
	"updater" varchar(20),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"is_published" timestamp,
	"saved_template_id" varchar(20),
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(200) PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"post_count" integer DEFAULT 0,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

ALTER TABLE "file_storage_categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "file_tag_relations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "file_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "navigation_menus" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "navigations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "menus" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_key_access_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_key_usage_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "general_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "api_key_usage_logs" CASCADE;--> statement-breakpoint
DROP TABLE "api_key_usage_logs" CASCADE;--> statement-breakpoint
/* Data Migration: Merge site_settings and general_settings into settings */
INSERT INTO "settings" ("tenant_id", "name", "value", "description", "group", "deleted_at", "created_at", "updated_at")
SELECT "tenant_id", "name", "value", "description", 'general', "deleted_at", "created_at", "updated_at" 
FROM "general_settings" ON CONFLICT ("tenant_id", "name") DO NOTHING;
--> statement-breakpoint

INSERT INTO "settings" ("tenant_id", "name", "value", "description", "group", "deleted_at", "created_at", "updated_at")
SELECT "tenant_id", "name", "value", "description", 'site', "deleted_at", "created_at", "updated_at" 
FROM "site_settings" ON CONFLICT ("tenant_id", "name") DO NOTHING;
--> statement-breakpoint

DROP POLICY "tenant_isolation" ON "general_settings" CASCADE;--> statement-breakpoint
DROP TABLE "general_settings" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "site_settings" CASCADE;--> statement-breakpoint
DROP TABLE "site_settings" CASCADE;--> statement-breakpoint
ALTER TABLE "user_2fa_code" DROP CONSTRAINT "user_2fa_code_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_password_reset" DROP CONSTRAINT "user_password_reset_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "user_2fa_code_user_id_idx";--> statement-breakpoint
DROP INDEX "user_password_reset_user_id_idx";--> statement-breakpoint
DROP INDEX "org_members_invite_token_idx";--> statement-breakpoint
DROP INDEX "parent_id_idx";--> statement-breakpoint
DROP INDEX "group_order_idx";--> statement-breakpoint
DROP INDEX "deleted_at_idx";--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_tenant_id_name_pk";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "invite_token" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD PRIMARY KEY ("name");--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "group" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "user_2fa_code" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "user_password_reset" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "navigation_menus" ADD COLUMN "style" varchar(20) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "navigation_menus" ADD COLUMN "target_blank" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "navigation_menus" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "navigations" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "account_id" uuid;--> statement-breakpoint

/* Data Migration */
-- Sync users into foreign_accounts
INSERT INTO "foreign_accounts" (
    "id", "email", "name", "avatar", "active", "created_at", "updated_at"
)
SELECT gen_random_uuid(), "email", "name", "avatar", true, "created_at", "updated_at"
FROM "users"
WHERE "email" NOT IN (SELECT "email" FROM "foreign_accounts");
--> statement-breakpoint

UPDATE "user_2fa_code" SET "account_id" = a."id"
FROM "users" u
JOIN "foreign_accounts" a ON a."email" = u."email"
WHERE "user_2fa_code"."user_id" = u."id";
--> statement-breakpoint

UPDATE "user_password_reset" SET "account_id" = a."id"
FROM "users" u
JOIN "foreign_accounts" a ON a."email" = u."email"
WHERE "user_password_reset"."user_id" = u."id";
--> statement-breakpoint

UPDATE "members" SET "account_id" = a."id"
FROM "users" u
JOIN "foreign_accounts" a ON a."email" = u."email"
WHERE "members"."user_id" = u."id";
--> statement-breakpoint

-- Map pending invites by email if possible
UPDATE "members" SET "account_id" = a."id"
FROM "foreign_accounts" a
WHERE "members"."email" = a."email" AND "members"."account_id" IS NULL;
--> statement-breakpoint

-- Cleanup unmappable rows to satisfy NOT NULL constraint
DELETE FROM "user_2fa_code" WHERE "account_id" IS NULL;--> statement-breakpoint
DELETE FROM "user_password_reset" WHERE "account_id" IS NULL;--> statement-breakpoint
DELETE FROM "members" WHERE "account_id" IS NULL;--> statement-breakpoint

-- Enforce constraints
ALTER TABLE "user_2fa_code" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_password_reset" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "invite_expired_at" timestamp;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "is_secret" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "page_categories" ADD CONSTRAINT "page_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_category_relations" ADD CONSTRAINT "page_category_relations_post_id_pages_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_category_relations" ADD CONSTRAINT "page_category_relations_category_id_page_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."page_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updater_users_id_fk" FOREIGN KEY ("updater") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_saved_template_id_page_templates_id_fk" FOREIGN KEY ("saved_template_id") REFERENCES "public"."page_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_categories_user_id_idx" ON "page_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_category_relations_post_id_idx" ON "page_category_relations" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "page_category_relations_category_id_idx" ON "page_category_relations" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "page_templates_user_id_idx" ON "page_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_templates_page_id_idx" ON "page_templates" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "pages_user_id_idx" ON "pages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_2fa_code_account_id_idx" ON "user_2fa_code" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "user_password_reset_account_id_idx" ON "user_password_reset" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_idx" ON "api_keys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "file_storage_categories_name_idx" ON "file_storage_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "members_account_id_idx" ON "members" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "members_role_id_idx" ON "members" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "members_invite_token_idx" ON "members" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "menus_parent_id_idx" ON "menus" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "menus_group_order_idx" ON "menus" USING btree ("group","sort_order");--> statement-breakpoint
CREATE INDEX "menus_deleted_at_idx" ON "menus" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "api_key_access_logs_api_key_id_idx" ON "api_key_access_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_key_access_logs_user_id_idx" ON "api_key_access_logs" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user_2fa_code" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "user_password_reset" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "file_storage_categories" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "file_tag_relations" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "file_tags" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "navigation_menus" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "navigation_menus" DROP COLUMN "order_number";--> statement-breakpoint
ALTER TABLE "navigations" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "token_expired_at";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "login_method";--> statement-breakpoint
ALTER TABLE "menus" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "menus" DROP COLUMN "order_number";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "login_method";--> statement-breakpoint
ALTER TABLE "api_key_access_logs" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "api_keys" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "file_storage_categories" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "file_tag_relations" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "file_tags" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "files" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "navigation_menus" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "navigations" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "members" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "menus" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "roles" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "api_key_access_logs" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "settings" CASCADE;