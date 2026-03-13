/**
 * @deprecated siteSettings 已合併到 settings 表
 * 請使用 settings 表，並以 group='site' 過濾前端設定
 *
 * 此檔案保留以便向後相容，將在後續版本移除
 */

import { settings, settingsSchema, settingsInsertSchema, settingsUpdateSchema } from "./setting";
import type zod from "zod";

/**
 * @deprecated 使用 settings 表並以 group='site' 過濾
 */
export const siteSettings = settings;

/**
 * @deprecated 使用 settingsSchema
 */
export const siteSettingsSchema = settingsSchema;

/**
 * @deprecated 使用 settingsInsertSchema
 */
export const siteSettingsInsertSchema = settingsInsertSchema;

/**
 * @deprecated 使用 settingsUpdateSchema
 */
export const siteSettingsUpdateSchema = settingsUpdateSchema;

/**
 * @deprecated 使用 TSettings
 */
export type TSiteSetting = zod.infer<typeof siteSettingsSchema>;

/**
 * @deprecated 使用 TSettingsInsert
 */
export type TSiteSettingInsert = zod.infer<typeof siteSettingsInsertSchema>;

/**
 * @deprecated 使用 TSettingsUpdate
 */
export type TSiteSettingUpdate = zod.infer<typeof siteSettingsUpdateSchema>;
