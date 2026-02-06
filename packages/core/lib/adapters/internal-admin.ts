
import { getDynamicDb } from "../db/dynamic";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { type AdminAuthAdapter, type AdminUser } from "../adapters";

export class InternalAdminAdapter implements AdminAuthAdapter {
    async getAdminUser(email: string): Promise<AdminUser | null> {
        const db = await getDynamicDb();
        const user = await db.query.users.findFirst({
            where: (t, { eq }) => eq(t.email, email),
            with: {
                developer: true,
            },
        });

        // 僅允許具備開發者身分的用戶透過此適配器驗證
        if (!user || !user.developer) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            name: user.name,
            lastLoginAt: user.lastLoginAt,
        };
    }

    async updateLastLogin(id: string): Promise<void> {
        const db = await getDynamicDb();
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
    }

    async updatePassword(email: string, passwordHash: string): Promise<void> {
        const db = await getDynamicDb();
        await db.update(users).set({
            password: passwordHash,
            mustChangePassword: false,
            updatedAt: new Date()
        }).where(eq(users.email, email));
    }
}
