import { getSystemSettings } from "@heiso/core/server/services/system/setting";
import { getSiteSettings } from "@heiso/core/server/site.service";
import type { Settings } from "@heiso/core/types/system";

export async function settings(withoutKey: boolean = false): Promise<Settings> {
  const data = await getSystemSettings(withoutKey);
  // Prefer environment variable if set
  if (process.env.NOTIFY_EMAIL) {
    data["NOTIFY_EMAIL"] = process.env.NOTIFY_EMAIL;
  }
  if (process.env.RESEND_API_KEY) {
    data["RESEND_API_KEY"] = process.env.RESEND_API_KEY;
  }
  if (process.env.NBEE_AWS_ACCESS_KEY) {
    data["AWS_ACCESS_KEY"] = process.env.NBEE_AWS_ACCESS_KEY;
  }
  if (process.env.NBEE_AWS_SECRET_KEY) {
    data["AWS_SECRET_KEY"] = process.env.NBEE_AWS_SECRET_KEY;
  }
  if (process.env.NBEE_AWS_S3_REGION) {
    data["AWS_S3_REGION"] = process.env.NBEE_AWS_S3_REGION;
  }
  if (process.env.NBEE_AWS_S3_BUCKET) {
    data["AWS_S3_BUCKET"] = process.env.NBEE_AWS_S3_BUCKET;
  }
  return data;
}

export function site(): Promise<Settings> {
  return getSiteSettings() as Promise<Settings>;
}
