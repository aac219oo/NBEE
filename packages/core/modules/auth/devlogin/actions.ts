"use server";

import { hashPassword } from "@heiso/core/lib/hash";
import { getAdminAuthAdapter } from "@heiso/core/lib/adapters";

// Server Action to check status
export async function checkAdminStatus(email: string) {
    const adminAuth = getAdminAuthAdapter();
    if (!adminAuth) {
        return { error: "Admin auth not available" };
    }

    try {
        const user = await adminAuth.getAdminUser(email);
        if (!user) return { error: "User not found" };
        return { lastLoginAt: user.lastLoginAt };
    } catch (e) {
        console.error(e);
        return { error: "Database error" };
    }
}

// Server Action to update password
export async function updateAdminPassword(email: string, newPassword: string) {
    const adminAuth = getAdminAuthAdapter();
    if (!adminAuth) {
        return { error: "Admin auth not available" };
    }

    try {
        const passwordHash = await hashPassword(newPassword);
        await adminAuth.updatePassword(email, passwordHash);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Failed to update password" };
    }
}

