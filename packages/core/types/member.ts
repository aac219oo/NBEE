import { z } from 'zod';

/**
 * 租戶角色類型
 * - 'owner': 租戶實體擁有者，負責帳務與全局設定
 * - 'admin': 租戶內的高級管理人員
 * - 'member': 一般成員
 */
export const RoleSchema = z.enum(['owner', 'admin', 'member']);
export type Role = z.infer<typeof RoleSchema>;

/**
 * 成員狀態類型
 */
export const MemberStatusSchema = z.enum(['invited', 'active', 'inactive', 'suspended']);
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
