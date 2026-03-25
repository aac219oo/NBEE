import {
  getGeneralSettings,
  getSettings,
  getSiteSettings,
} from "@heiso/core/server/services/system/setting";
import type { Settings } from "@heiso/core/types/system";

export async function settings(withoutKey: boolean = false): Promise<Settings> {
  const data = await getSettings(withoutKey);
  // Prefer environment variable if set
  if (process.env.NOTIFY_EMAIL) {
    data["NOTIFY_EMAIL"] = process.env.NOTIFY_EMAIL;
  }
  if (process.env.RESEND_API_KEY) {
    data["RESEND_API_KEY"] = process.env.RESEND_API_KEY;
  }
  if (process.env.AWS_ACCESS_KEY) {
    data["AWS_ACCESS_KEY"] = process.env.AWS_ACCESS_KEY;
  }
  if (process.env.AWS_SECRET_KEY) {
    data["AWS_SECRET_KEY"] = process.env.AWS_SECRET_KEY;
  }
  if (process.env.AWS_S3_REGION) {
    data["AWS_S3_REGION"] = process.env.AWS_S3_REGION;
  }
  if (process.env.AWS_S3_BUCKET) {
    data["AWS_S3_BUCKET"] = process.env.AWS_S3_BUCKET;
  }
  return data;
}

export function site(): Promise<Settings> {
  return getSiteSettings();
}

export function generalSettings(): Promise<Settings> {
  return getGeneralSettings();
}
