import { z } from 'zod';

/**
 * 租戶角色類型
 * - 'owner': 租戶實體擁有者，fullAccess
 * - 'member': 一般成員，權限由 customRole 決定
 */
export const RoleSchema = z.enum(['owner', 'member']);
export type Role = z.infer<typeof RoleSchema>;

/**
 * 成員狀態類型
 */
export const MemberStatusSchema = z.enum(['invited', 'active', 'inactive', 'suspended']);
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
