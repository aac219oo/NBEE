import { relations } from "drizzle-orm";
import {
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type zod from "zod/v4";
import { generateId } from "@heiso/core/lib/id-generator";
import { users } from "../../auth";

export const pageTemplates = pgTable(
  "page_templates",
  {
    id: varchar("id", { length: 20 })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar("user_id", { length: 20 })
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    pageId: varchar("page_id", { length: 20 }),
    thumbnail: varchar("thumbnail", { length: 255 }),
    htmlContent: json("html_content"),
    mobileContent: json("mobile_content"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("page_templates_user_id_idx").on(table.userId),
    index("page_templates_page_id_idx").on(table.pageId),
  ],
);

export const posts = pgTable(
  "pages",
  {
    id: varchar("id", { length: 20 })
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar("user_id", { length: 20 })
      .notNull()
      .references(() => users.id),
    // categoryId: varchar('category_id', { length: 20 }),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }),
    excerpt: text("excerpt"),
    featuredImage: varchar("featured_image", { length: 255 }),
    featuredVideo: varchar("featured_video", { length: 255 }),
    content: json("content"),
    html: text("html"),
    contentMobile: json("content_mobile"),
    htmlMobile: text("html_mobile"),
    updater: varchar("updater", { length: 20 }).references(() => users.id),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    isPublished: timestamp("is_published"),
    savedTemplateId: varchar("saved_template_id", { length: 20 }).references(
      () => pageTemplates.id,
    ),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("pages_user_id_idx").on(table.userId),
    // index('pages_category_id_idx').on(table.categoryId),
    index("pages_slug_idx").on(table.slug),
    index("pages_status_idx").on(table.status),
  ],
);

export const pageCategories = pgTable(
  "page_categories",
  {
    id: varchar("id", { length: 20 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: varchar("user_id", { length: 20 })
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    order: integer("order_number").default(0),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("page_categories_user_id_idx").on(table.userId)],
);

export const tags = pgTable(
  "tags",
  {
    id: varchar("id", { length: 200 }).notNull().primaryKey(),
    userId: varchar("user_id", { length: 20 })
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    postCount: integer("post_count").default(0),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("tags_user_id_idx").on(table.userId)],
);

export const pageCategoryRelations = pgTable(
  "page_category_relations",
  {
    postId: varchar("post_id")
      .notNull()
      .references(() => posts.id),
    categoryId: varchar("category_id")
      .notNull()
      .references(() => pageCategories.id),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.categoryId] }),
    index("page_category_relations_post_id_idx").on(table.postId),
    index("page_category_relations_category_id_idx").on(table.categoryId),
  ],
);

export const postRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  categories: many(pageCategoryRelations),
}));

export const postPageCategoryRelations = relations(
  pageCategoryRelations,
  ({ one }) => ({
    post: one(posts, {
      fields: [pageCategoryRelations.postId],
      references: [posts.id],
    }),
    category: one(pageCategories, {
      fields: [pageCategoryRelations.categoryId],
      references: [pageCategories.id],
    }),
  }),
);

export const pageCategoriesRelations = relations(
  pageCategories,
  ({ one, many }) => ({
    user: one(users, {
      fields: [pageCategories.userId],
      references: [users.id],
    }),
    posts: many(pageCategoryRelations),
  }),
);

export const tagRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const postsSchema = createSelectSchema(posts);
export const postsInsertSchema = createInsertSchema(posts);
export const postsUpdateSchema = createUpdateSchema(posts);

export const pageTemplatesSchema = createSelectSchema(pageTemplates);

export const pageCategoriesSchema = createSelectSchema(pageCategories);
export const pageCategoriesInsertSchema = createInsertSchema(pageCategories);
export const pageCategoriesUpdateSchema = createUpdateSchema(pageCategories);

export const tagsSchema = createSelectSchema(tags);
export const tagsInsertSchema = createInsertSchema(tags);
export const tagsUpdateSchema = createUpdateSchema(tags);

export type TPost = zod.infer<typeof postsSchema>;
export type TPostInsert = zod.infer<typeof postsInsertSchema>;
export type TPostUpdate = zod.infer<typeof postsUpdateSchema>;

export type TPageCategory = zod.infer<typeof pageCategoriesSchema>;
export type TPageCategoryInsert = zod.infer<typeof pageCategoriesInsertSchema>;
export type TPageCategoryUpdate = zod.infer<typeof pageCategoriesUpdateSchema>;

export type TTag = zod.infer<typeof tagsSchema>;
export type TTagInsert = zod.infer<typeof tagsInsertSchema>;
export type TTagUpdate = zod.infer<typeof tagsUpdateSchema>;
