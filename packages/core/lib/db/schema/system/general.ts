/**
 * @deprecated generalSettings 已合併到 settings 表
 * 請使用 settings 表，並以 group='general' 過濾一般設定
 *
 * 此檔案保留以便向後相容，將在後續版本移除
 */

import {
  settings,
  settingsSchema,
  settingsInsertSchema,
  settingsUpdateSchema,
  type TSettings,
  type TSettingsInsert,
  type TSettingsUpdate,
} from "./setting";

/**
 * @deprecated 使用 settings 表並以 group='general' 過濾
 */
export const generalSettings = settings;

/**
 * @deprecated 使用 settingsSchema
 */
export const generalSettingsSchema = settingsSchema;

/**
 * @deprecated 使用 settingsInsertSchema
 */
export const generalSettingsInsertSchema = settingsInsertSchema;

/**
 * @deprecated 使用 settingsUpdateSchema
 */
export const generalSettingsUpdateSchema = settingsUpdateSchema;

/**
 * @deprecated 使用 TSettings
 */
export type TGeneralSetting = TSettings;

/**
 * @deprecated 使用 TSettingsInsert
 */
export type TGeneralSettingInsert = TSettingsInsert;

/**
 * @deprecated 使用 TSettingsUpdate
 */
export type TGeneralSettingUpdate = TSettingsUpdate;
