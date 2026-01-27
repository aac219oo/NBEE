"use server";

import { and, asc, desc, eq, exists, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { pageCategories, pageCategoryRelations, posts, users } from "@heiso/core/lib/db/schema";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import * as schema from "@heiso/core/lib/db/schema";
import { revalidatePath } from "next/cache";
import { slugify } from "@heiso/core/lib/url";
import { auth } from "@heiso/core/modules/auth/auth.config"
import { navigationMenus } from "@/lib/db/schema";
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

async function addPost({
    title,
    slug,
    content,
    html,
    htmlMobile,
    contentMobile,
    excerpt,
    featuredImage,
    featuredVideo,
    categoryIds,
    published,
}: {
    title: string;
    slug: string;
    content: unknown;
    html?: string;
    htmlMobile?: string | null;
    contentMobile?: unknown | null;
    excerpt: string;
    featuredImage?: string;
    featuredVideo?: string;
    categoryIds?: string[];
    published: boolean;
}) {
    const session = await auth();
    if (!session?.user?.id) return;
    const userId = session.user.id;
    const db = await getDynamicDb(schema);

    const insertValues: typeof posts.$inferInsert = {
        userId,
        updater: userId,
        title,
        content,
        contentMobile,
        // 僅在發布時寫入 html/htmlMobile
        excerpt,
        slug: slug ? slug : slugify(title),
        featuredImage,
        featuredVideo,
        status: published ? "published" : "draft",
        isPublished: published ? new Date() : null,
    };
    if (published) {
        if (typeof html !== "undefined") insertValues.html = html;
        if (typeof htmlMobile !== "undefined")
            insertValues.htmlMobile = htmlMobile ?? null;
    }

    const [result] = await db.insert(posts).values(insertValues).returning();

    if (categoryIds?.length) {
        await db
            .delete(pageCategoryRelations)
            .where(eq(pageCategoryRelations.postId, result.id));

        await db.insert(pageCategoryRelations).values(
            categoryIds.map((id) => ({
                postId: result.id,
                categoryId: id,
            })),
        );
    }

    // 變更後重新驗證列表頁快取（一般列表與分類列表）
    try {
        revalidatePath("/dashboard/pages/post", "page");
        if (categoryIds?.length) {
            for (const cid of categoryIds) {
                revalidatePath(`/dashboard/pages/${cid}/post`, "page");
            }
        }
    } catch { }

    return result;
}

async function updatePost(
    id: string,
    {
        title,
        slug,
        content,
        html,
        htmlMobile,
        contentMobile,
        excerpt,
        featuredImage,
        featuredVideo,
        categoryIds,
        published,
    }: {
        title: string;
        slug: string;
        content: unknown;
        html?: string;
        htmlMobile?: string | null;
        contentMobile?: unknown | null;
        excerpt: string;
        featuredImage?: string;
        featuredVideo?: string;
        categoryIds?: string[];
        published: boolean;
    },
) {
    const session = await auth();
    if (!session?.user?.id) return;
    const userId = session.user.id;
    const db = await getDynamicDb(schema);

    const current = await db.query.posts.findFirst({
        columns: { status: true, isPublished: true },
        where: and(eq(posts.id, id), isNull(posts.deletedAt)),
    });

    const nextStatus = published
        ? "published"
        : current?.status === "published"
            ? "editing"
            : (current?.status ?? "draft");
    // 若此次動作為發布，總是更新發布時間；非發布則保留原發布時間
    const nextIsPublished = published
        ? new Date()
        : (current?.isPublished ?? null);

    const updateData: Partial<typeof posts.$inferInsert> = {
        title,
        content,
        contentMobile,
        excerpt,
        slug: slug ? slug : slugify(title),
        featuredImage,
        featuredVideo,
        status: nextStatus,
        isPublished: nextIsPublished,
    };
    // 僅在發布時更新 html/htmlMobile
    if (published) {
        if (typeof html !== "undefined") updateData.html = html;
        if (typeof htmlMobile !== "undefined")
            updateData.htmlMobile = htmlMobile ?? null;
    }
    // 無論發布或儲存，皆更新 updatedAt
    (updateData as any).updatedAt = new Date();
    // 更新者
    (updateData as any).updater = userId;

    const [result] = await db
        .update(posts)
        .set(updateData)
        .where(eq(posts.id, id))
        .returning();

    if (categoryIds?.length) {
        await db
            .delete(pageCategoryRelations)
            .where(eq(pageCategoryRelations.postId, result.id));

        await db.insert(pageCategoryRelations).values(
            categoryIds.map((id) => ({
                postId: result.id,
                categoryId: id,
            })),
        );
        await syncMenusOnCategoryChange(result.id, categoryIds);
    }

    // 變更後重新驗證列表頁快取（一般列表與分類列表）
    try {
        revalidatePath("/dashboard/pages/post", "page");
        if (categoryIds?.length) {
            for (const cid of categoryIds) {
                revalidatePath(`/dashboard/pages/${cid}/post`, "page");
            }
        }
    } catch { }

    return result;
}

async function syncMenusOnCategoryChange(
    postId: string,
    categoryIds: string[],
) {
    const db = await getDynamicDb(schema);
    const primary = categoryIds?.[0];
    if (!primary) return;

    const items = await db.query.navigationMenus.findMany({
        where: (t, { and, isNull, like, eq }) =>
            and(
                isNull(t.deletedAt),
                eq(t.linkType, "page"),
                like(t.link, `%${postId}%`),
            ),
    });
    if (!items || items.length === 0) return;

    const updates = items.map((item: any) => {
        const raw = String(item.link ?? "");
        const pageId = raw.includes("/") ? raw.split("/")[1] : raw;
        const nextLink = `${primary}/${pageId}`;
        return db
            .update(navigationMenus)
            .set({ link: nextLink, updatedAt: new Date() })
            .where(eq(navigationMenus.id, item.id));
    });
    await Promise.all(updates);
    try {
        revalidatePath("./navigation", "page");
    } catch { }
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

export async function savePost(
    data: {
        title: string;
        slug: string;
        content: unknown;
        html?: string;
        htmlMobile?: string | null;
        contentMobile?: unknown | null;
        excerpt: string;
        featuredImage?: string;
        featuredVideo?: string;
        categoryIds?: string[];
        published: boolean;
    },
    id?: string,
) {
    const result = id ? await updatePost(id, data) : await addPost(data);
    return result;
}