"use server";

import { eq } from "drizzle-orm";
import type { Value } from "platejs";
import { auth } from "@heiso/core/modules/auth/auth.config"
import { pageTemplates, posts } from "@heiso/core/lib/db/schema";
import { generateId } from "@heiso/core/lib/id-generator";
import { getDynamicDb } from "@heiso/core/lib/db/dynamic";

export type TemplateItem = {
  id: string;
  userId: string;
  pageId: string | null;
  name: string;
  description?: string;
  thumbnail: string;
  htmlContent: Value;
  mobileContent: Value | undefined;
  category: string;
};

export type ArticleTemplate = TemplateItem;

/**
 * 儲存新的模板
 */
export async function saveTemplate(data: {
  name: string;
  description?: string;
  pageId?: string;
  htmlContent: unknown;
  mobileContent?: unknown;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授權");
  }
  const db = await getDynamicDb();

  // 將 pageId 設為 null，因為模板不需要關聯特定頁面
  const template = await db
    .insert(pageTemplates)
    .values({
      id: generateId(),
      userId: session.user.id,
      name: data.name,
      pageId: data.pageId,
      thumbnail: null,
      htmlContent: data.htmlContent,
      mobileContent: data.mobileContent || null,
    })
    .returning();

  return {
    success: true,
    template: {
      id: template[0].id,
      name: template[0].name,
      pageId: template[0].pageId,
      createdAt: template[0].createdAt,
    },
  };
}

/**
 * 根據 ID 獲取單一模板
 */
export async function getTemplateById(
  templateId: string,
): Promise<ArticleTemplate | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授權");
  }
  const db = await getDynamicDb();

  const template = await db.query.pageTemplates.findFirst({
    where: (t, { eq, isNull, and }) =>
      and(
        eq(t.id, templateId),
        eq(t.userId, session.user.id!),
        isNull(t.deletedAt),
      ),
  });

  if (!template) {
    return null;
  }

  return {
    id: template.id,
    userId: template.userId,
    pageId: template.pageId,
    name: template.name,
    thumbnail: template.thumbnail || "",
    htmlContent: template.htmlContent as Value,
    mobileContent: template.mobileContent as Value,
    category: "custom",
  };
}

/**
 * 更新現有模板
 */
export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    htmlContent?: unknown;
    mobileContent?: unknown;
  },
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授權");
  }
  const db = await getDynamicDb();

  // 檢查模板是否存在且屬於當前用戶
  const existingTemplate = await db.query.pageTemplates.findFirst({
    where: (t, { eq, isNull, and }) =>
      and(
        eq(t.id, templateId),
        eq(t.userId, session.user.id!),
        isNull(t.deletedAt),
      ),
  });

  if (!existingTemplate) {
    throw new Error("模板不存在或無權限");
  }

  // 更新模板
  const updatedTemplate = await db
    .update(pageTemplates)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(pageTemplates.id, templateId))
    .returning();

  return {
    success: true,
    template: {
      id: updatedTemplate[0].id,
      name: updatedTemplate[0].name,
      pageId: updatedTemplate[0].pageId,
      updatedAt: updatedTemplate[0].updatedAt,
      htmlContent: updatedTemplate[0].htmlContent as Value,
      mobileContent: updatedTemplate[0].mobileContent as Value | undefined,
    },
  };
}

/**
 * 讀取文章模板清單
 */
export async function getTemplatesList(): Promise<ArticleTemplate[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授權");
  }

  const userId = session.user.id;
  if (!userId) {
    throw new Error("用戶 ID 不存在");
  }
  const db = await getDynamicDb();

  const templates = await db.query.pageTemplates.findMany({
    where: (t, { eq, isNull, and }) =>
      and(eq(t.userId, session.user.id!), isNull(t.deletedAt)),
    orderBy: (t, { desc }) => desc(t.createdAt),
  });

  return templates.map((template) => ({
    id: template.id,
    userId: template.userId,
    pageId: template.pageId,
    name: template.name,
    thumbnail: template.thumbnail || "",
    htmlContent: template.htmlContent as Value,
    mobileContent: template.mobileContent as Value | undefined,
    category: "custom", // 預設分類為 custom
  }));
}

/**
 * 刪除模板
 */
export async function deleteTemplate(templateId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授權");
  }
  const db = await getDynamicDb();

  // 檢查模板是否存在且屬於當前用戶
  const existingTemplate = await db.query.pageTemplates.findFirst({
    where: (t, { eq, isNull, and }) =>
      and(
        eq(t.id, templateId),
        eq(t.userId, session.user.id!),
        isNull(t.deletedAt),
      ),
  });

  if (!existingTemplate) {
    throw new Error("模板不存在或無權限");
  }

  await db
    .update(pageTemplates)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pageTemplates.id, templateId));

  return {
    success: true,
    message: "模板已刪除",
  };
}

/**
 * 設定文章所使用的模板（僅寫入 posts.savedTemplateId）
 */
export async function savePostTemplate(postId: string, templateId: string) {
  const db = await getDynamicDb();
  await db
    .update(posts)
    .set({ savedTemplateId: templateId, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}
