"use server";

import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { settings } from "@heiso/core/lib/db/schema/system/setting";

const KEY_GROUP = "api_keys";

type KeyMapping = {
  "openai.api_key": string;
  "github.access_token": string;
  "resend.api_key": string;
};

export async function getKeys() {
  const db = await getDynamicDb();

  const keySettings = await db.query.settings.findMany({
    where: (fields, { eq }) => eq(fields.group, KEY_GROUP),
  });

  if (keySettings.length === 0) return null;

  const keys: any = {
    openai: { api_key: "" },
    github: { access_token: "" },
    resend: { api_key: "" },
  };

  return keys;
}

export async function saveKeys(data: any) {
  const db = await getDynamicDb();

  const keyMappings: KeyMapping = {
    "openai.api_key": data.openai.api_key,
    "github.access_token": data.github.access_token,
    "resend.api_key": data.resend.api_key,
  };

  await Promise.all(
    Object.entries(keyMappings).map(([name, value]) =>
      db
        .insert(settings)
        .values({
          name,
          value,
          group: KEY_GROUP,
          isKey: true,
        })
        .onConflictDoUpdate({
          target: settings.name,
          set: {
            value,
            updatedAt: new Date(),
          },
        }),
    ),
  );
}
