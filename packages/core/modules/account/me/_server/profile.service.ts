"use server";

import { updateAccount } from "@heiso/core/lib/platform/account-adapter";

/**
 * Update avatar
 * Core mode: Update accounts table
 * CMS mode: Requires Platform API
 */
export async function updateAvatar(userId: string, avatar: string) {
  try {
    await updateAccount(userId, {
      avatar,
      updatedAt: new Date(),
    } as any);

    return {
      success: true,
      message: "Avatar updated successfully",
    };
  } catch (error) {
    console.error("Failed to update avatar:", error);

    return {
      success: false,
      error: "Failed to update avatar, please try again later",
    };
  }
}

/**
 * Update nickname
 * Core mode: Update accounts table
 * CMS mode: Requires Platform API
 */
export async function updateNickname(userId: string, name: string) {
  try {
    await updateAccount(userId, {
      name,
      updatedAt: new Date(),
    } as any);

    return {
      success: true,
      message: "Nickname updated successfully",
    };
  } catch (error) {
    console.error("Failed to update nickname:", error);

    return {
      success: false,
      error: "Failed to update nickname, please try again later",
    };
  }
}
