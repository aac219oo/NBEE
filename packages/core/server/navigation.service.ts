"use server";

import { and, asc, desc, eq, exists, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { pageCategories, pageCategoryRelations, posts, users } from "@heiso/core/lib/db/schema";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import * as schema from "@heiso/core/lib/db/schema";

export interface Post {
  id: string;
  title: string | null;
  slug: string;
  content: unknown;
  html: string | null;
  contentMobile: unknown;
  htmlMobile: string | null;
  excerpt: string | null;
  featuredImage: string | null;
  featuredVideo: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  categories: {
    category: { id: string; name: string } | null;
  }[];
  status: string;
  isPublished: Date | null;
  savedTemplateId?: string | null;
  updater?: string | null;
}

export async function getCategoryList() {
  const db = await getDynamicDb(schema);
  const categoryList = await db
    .select()
    .from(pageCategories)
    .where(and(isNull(pageCategories.deletedAt)))
    .orderBy(asc(pageCategories.name));

  return categoryList;
}

export async function getPostList({
  categoryId,
  start,
  limit,
}: {
  categoryId?: string;
  start?: number;
  limit?: number;
}) {
  const db = await getDynamicDb(schema);
  const updaterUsers = alias(users, "updater_users");
  const whereCond = categoryId
    ? and(
      isNull(posts.deletedAt),
      exists(
        db
          .select({ one: sql<boolean>`1` })
          .from(pageCategoryRelations)
          .where(
            and(
              eq(pageCategoryRelations.postId, posts.id),
              eq(pageCategoryRelations.categoryId, categoryId),
            ),
          ),
      ),
    )
    : isNull(posts.deletedAt);

  const base = db
    .select({
      id: posts.id,
      userId: posts.userId,
      title: posts.title,
      content: posts.content,
      slug: posts.slug,
      excerpt: posts.excerpt,
      status: posts.status,
      isPublished: posts.isPublished,
      updaterId: posts.updater,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      updaterUser: {
        id: updaterUsers.id,
        name: updaterUsers.name,
        avatar: updaterUsers.avatar,
      },
      updatedAt: posts.updatedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .leftJoin(updaterUsers, eq(posts.updater, updaterUsers.id))
    .where(whereCond);

  const lim = typeof limit === "number" ? base.limit(limit) : base;
  const paginated = typeof start === "number" ? lim.offset(start) : lim;
  const data = await paginated.orderBy(desc(posts.createdAt));

  const [{ count: total }] = categoryId
    ? await db
      .select({ count: sql<number>`count(distinct ${posts.id})` })
      .from(posts)
      .where(
        and(
          isNull(posts.deletedAt),
          exists(
            db
              .select({ one: sql<boolean>`1` })
              .from(pageCategoryRelations)
              .where(
                and(
                  eq(pageCategoryRelations.postId, posts.id),
                  eq(pageCategoryRelations.categoryId, categoryId),
                ),
              ),
          ),
        ),
      )
    : await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(isNull(posts.deletedAt));

  return {
    data: data.map((p) => ({
      id: p.id,
      userId: p.userId,
      title: p.title,
      content: p.content,
      slug: p.slug,
      excerpt: p.excerpt,
      status: p.status,
      isPublished: p.isPublished,
      user: p.user ?? null,
      updater:
        p.updaterUser ??
        (p.updaterId
          ? { id: p.updaterId, name: p.updaterId, avatar: null }
          : null),
      updated: p.updatedAt,
      created: p.createdAt,
    })),
    total: total ?? 0,
  };
}

export async function getPost(id: string): Promise<Post | null> {
  const db = await getDynamicDb(schema);
  // Prefer simple joins to avoid complex lateral/json aggregation that can fail in some drivers
  try {
    const baseRows = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        content: posts.content,
        contentMobile: posts.contentMobile,
        html: posts.html,
        htmlMobile: posts.htmlMobile,
        excerpt: posts.excerpt,
        featuredImage: posts.featuredImage,
        featuredVideo: posts.featuredVideo,
        status: posts.status,
        isPublished: posts.isPublished,
        savedTemplateId: posts.savedTemplateId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        updater: posts.updater,
        userId: users.id,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .orderBy(desc(posts.createdAt))
      .limit(1);

    const base = baseRows[0];
    if (!base) return null;

    const categoryRows = await db
      .select({
        postId: pageCategoryRelations.postId,
        categoryId: pageCategoryRelations.categoryId,
        id: pageCategoryRelations.categoryId,
        name: pageCategories.name,
      })
      .from(pageCategoryRelations)
      .leftJoin(
        pageCategories,
        eq(pageCategories.id, pageCategoryRelations.categoryId),
      )
      .where(eq(pageCategoryRelations.postId, base.id));

    const result: Post = {
      id: base.id,
      title: base.title ?? null,
      slug: base.slug,
      content: base.content,
      html: base.html ?? null,
      contentMobile: base.contentMobile,
      htmlMobile: base.htmlMobile ?? null,
      excerpt: base.excerpt ?? null,
      featuredImage: base.featuredImage ?? null,
      featuredVideo: base.featuredVideo ?? null,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      user: {
        id: base.userId!,
        name: base.userName!,
        avatar: base.userAvatar ?? null,
      },
      categories: categoryRows.map((c) => ({
        category: c.id ? { id: c.id, name: c.name ?? "" } : null,
      })),
      status: base.status,
      isPublished: base.isPublished ?? null,
      savedTemplateId: base.savedTemplateId ?? null,
      updater: base.updater ?? null,
    };

    return result;
  } catch (_err) {
    // Fallback to original relational query if needed
    const data = await db.query.posts.findFirst({
      columns: {
        id: true,
        title: true,
        slug: true,
        content: true,
        contentMobile: true,
        html: true,
        htmlMobile: true,
        excerpt: true,
        featuredImage: true,
        featuredVideo: true,
        status: true,
        isPublished: true,
        savedTemplateId: true,
        createdAt: true,
        updatedAt: true,
        updater: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        categories: {
          with: {
            category: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        // 已移除 post_tags 關聯
      },
      where: and(eq(posts.id, id), isNull(posts.deletedAt)),
      orderBy: desc(posts.createdAt),
    });

    if (!data) return null;
    return data as Post;
  }
}