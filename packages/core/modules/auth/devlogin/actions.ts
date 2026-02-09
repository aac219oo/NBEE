"use server";

import { settings } from "@heiso/core/config/settings";
import TwoFactorEmail from "@heiso/core/emails/2fa";
import { sendEmail } from "@heiso/core/lib/email";
import { ALLOWED_DEV_EMAILS } from "@heiso/core/modules/auth/auth.config";

// Helper to create Core Admin User & Member (without password for OTP flow)
async function ensureDevUserExists(email: string) {
    const { users, developers } = await import("@heiso/core/lib/db/schema");
    const { members } = await import("@heiso/core/lib/db/schema/permissions/member");
    const { hashPassword } = await import("@heiso/core/lib/hash");
    const { generateId } = await import("@heiso/core/lib/id-generator");
    const { db } = await import("@heiso/core/lib/db");
    const { getUser } = await import("@heiso/core/modules/auth/_server/user.service");

    // Check if user already exists
    const existingUser = await getUser(email);
    if (existingUser) {
        // [NEW LOGIC] Check if user is in developers table, if not, add them
        const developerRecord = await db.query.developers.findFirst({
            where: (t, { eq }) => eq(t.userId, existingUser.id),
        });

        if (!developerRecord) {
            await db.insert(developers).values({
                userId: existingUser.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        return existingUser;
    }

    // In Core mode, we might not have a tenant context, so we default to 'core'
    const tenantId = "core";

    // Generate random password (user won't use it, OTP-only)
    const randomPassword = await hashPassword(generateId(undefined, 32));

    // Get display name from email
    const displayName = email === "pm@heiso.io" ? "Core PM" : "Core Dev";

    // 1. Insert User
    const [newUser] = await db.insert(users).values({
        email,
        name: displayName,
        password: randomPassword,
        active: true,
        lastLoginAt: new Date(),
        loginMethod: "credentials",
        mustChangePassword: false,
        updatedAt: new Date(),
    }).returning();

    // 2. Insert Member
    await db.insert(members).values({
        email,
        tenantId,
        userId: newUser.id,
        isOwner: true,
        status: 'joined',
        roleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // 3. Insert Developer (for Core Admin)
    await db.insert(developers).values({
        userId: newUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return newUser;
}

// Generate 6-digit OTP code
function generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP for DevLogin
 * - Validates email is in allowed list
 * - Ensures user exists (creates if needed)
 * - Generates and sends OTP
 */
export async function sendDevOTP(email: string): Promise<{
    success: boolean;
    error?: string;
    expiresAt?: Date;
}> {
    // 1. Strict email check
    if (!ALLOWED_DEV_EMAILS.includes(email)) {
        return {
            success: false,
            error: "Access Denied. Only authorized emails are allowed.",
        };
    }

    try {
        // 2. Ensure user exists (create if needed)
        const user = await ensureDevUserExists(email);
        if (!user) {
            return {
                success: false,
                error: "Failed to create or find user",
            };
        }

        // 3. Generate OTP
        const { user2faCode } = await import("@heiso/core/lib/db/schema");
        const { getDynamicDb } = await import("@heiso/core/lib/db/dynamic");
        const { and, eq, lt } = await import("drizzle-orm");

        const db = await getDynamicDb();

        // Clean up expired OTPs for this user
        const now = new Date();
        await db.delete(user2faCode).where(
            and(eq(user2faCode.userId, user.id), lt(user2faCode.expiresAt, now))
        );

        // Generate new OTP
        const code = generateOTPCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save to database
        await db.insert(user2faCode).values({
            userId: user.id,
            code,
            used: false,
            expiresAt,
        });

        // 4. Send email
        const assets = await db.query.siteSettings.findFirst({
            where: (t, { eq }) => eq(t.name, "assets"),
        });
        const { logo } = (assets?.value || {}) as Record<string, string>;

        const { NOTIFY_EMAIL } = await settings();
        await sendEmail({
            from: NOTIFY_EMAIL as string,
            to: [email],
            subject: "[DevLogin] Your Verification Code",
            body: TwoFactorEmail({
                logoUrl: logo,
                code,
                username: user.name,
                expiresInMinutes: 10,
            }),
        });

        console.log(`[DevLogin] OTP sent to ${email}: ${code}`); // Dev convenience log

        return {
            success: true,
            expiresAt,
        };
    } catch (error) {
        console.error("[sendDevOTP] Failed:", error);
        return {
            success: false,
            error: "Failed to send OTP. Please try again.",
        };
    }
}

/**
 * Verify OTP for DevLogin
 * Returns userId on success for signIn
 */
export async function verifyDevOTP(email: string, code: string): Promise<{
    success: boolean;
    error?: string;
    userId?: string;
}> {
    // 1. Strict email check
    if (!ALLOWED_DEV_EMAILS.includes(email)) {
        return {
            success: false,
            error: "Access Denied",
        };
    }

    try {
        const { user2faCode, users } = await import("@heiso/core/lib/db/schema");
        const { getDynamicDb } = await import("@heiso/core/lib/db/dynamic");
        const { and, eq, gt } = await import("drizzle-orm");

        const db = await getDynamicDb();

        // Find user
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            return {
                success: false,
                error: "User not found",
            };
        }

        // Find valid OTP
        const otpRecord = await db.query.user2faCode.findFirst({
            where: and(
                eq(user2faCode.userId, user.id),
                eq(user2faCode.code, code),
                eq(user2faCode.used, false),
                gt(user2faCode.expiresAt, new Date())
            ),
        });

        if (!otpRecord) {
            return {
                success: false,
                error: "Invalid or expired code",
            };
        }

        // Mark OTP as used
        await db
            .update(user2faCode)
            .set({ used: true })
            .where(eq(user2faCode.id, otpRecord.id));

        // Update last login
        await db
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

        return {
            success: true,
            userId: user.id,
        };
    } catch (error) {
        console.error("[verifyDevOTP] Failed:", error);
        return {
            success: false,
            error: "Verification failed. Please try again.",
        };
    }
}
