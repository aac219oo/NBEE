"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { fileStorageCategories, files } from "@heiso/core/lib/db/schema";
import { generateId } from "@heiso/core/lib/id-generator";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { eq, sql } from "drizzle-orm";

function detectFileType(rawType: string) {
  const mimeToType: Record<string, string> = {
    "image/": "image",
    "video/": "video",
    "audio/": "audio",
    "application/pdf": "document",
    "application/zip": "archive",
    "application/x-rar-compressed": "archive",
    "application/x-7z-compressed": "archive",
  };

  let fileType = "other";
  for (const [mimePrefix, type] of Object.entries(mimeToType)) {
    if (rawType.startsWith(mimePrefix)) {
      fileType = type;
      break;
    }
  }

  return fileType;
}

const CATEGORY_DEFAULTS: Record<
  string,
  { name: string; icon: string; color: string }
> = {
  image: { name: "Images", icon: "image", color: "blue" },
  video: { name: "Videos", icon: "video", color: "purple" },
  audio: { name: "Audio", icon: "music", color: "yellow" },
  document: { name: "Documents", icon: "file-text", color: "green" },
  archive: { name: "Archives", icon: "archive", color: "orange" },
  other: { name: "Others", icon: "file", color: "gray" },
};

export async function saveFile(file: {
  name: string;
  size: number;
  type: string;
  url: string;
}) {
  const db = await getDynamicDb();
  const session = await auth();
  const accountId = session?.user?.id;
  if (!accountId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!file) {
    return Response.json({ error: "No file data provided" }, { status: 400 });
  }

  const extension = file.name.split(".").pop() || "";
  const fileType = detectFileType(file.type);
  const categoryDefault = CATEGORY_DEFAULTS[fileType] || CATEGORY_DEFAULTS.other;

  const result = await db.transaction(async (tx) => {
    // Upsert storage category
    await tx
      .insert(fileStorageCategories)
      .values({
        id: fileType,
        name: categoryDefault.name,
        icon: categoryDefault.icon,
        color: categoryDefault.color,
        fileCount: 1,
        size: file.size,
      })
      .onConflictDoUpdate({
        target: fileStorageCategories.id,
        set: {
          fileCount: sql`${fileStorageCategories.fileCount} + 1`,
          size: sql`${fileStorageCategories.size} + ${file.size}`,
        },
      });

    const [fileRecord] = await tx
      .insert(files)
      .values({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: fileType,
        extension,
        url: file.url,
        path: "",
        mimeType: file.type,
        metadata: {},
        ownerId: accountId,
        storageCategoryId: fileType,
      })
      .returning();

    return fileRecord;
  });

  return result;
}
