import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { DEFAULT_ROLES } from '@heiso/core/config/initDefaults';
import { navigations, settings } from "@heiso/core/lib/db/schema";
import { generateNavigationId } from "@heiso/core/lib/id-generator";
import { eq } from "drizzle-orm";

export async function provisionTenantDb(dbUrl: string, modules: string[], tenantId: string) {
    console.log(`[Provisioning] Starting for DB: ${dbUrl} with modules: ${modules.join(', ')}`);

    // 1. Connection
    const migrationClient = postgres(dbUrl, { max: 1 });
    const db = drizzle(migrationClient);

    // Helper to find migrations folder in Monorepo
    const findCoreMigrations = async (startDir: string): Promise<string | null> => {
        const { join, resolve } = await import("path");
        const { existsSync } = await import("fs");

        let current = startDir;
        for (let i = 0; i < 5; i++) { // Max depth 5
            const target = join(current, 'packages/core/drizzle');
            if (existsSync(target)) return target;

            // Check if we are inside packages/core already
            const localTarget = join(current, 'drizzle');
            if (existsSync(join(current, 'package.json')) && existsSync(localTarget)) {
                return localTarget;
            }

            const parent = resolve(current, '..');
            if (parent === current) break;
            current = parent;
        }
        return null;
    };

    const migrationsFolder = await findCoreMigrations(process.cwd());

    if (!migrationsFolder) {
        console.error(`[Provisioning] Could not locate 'packages/core/drizzle' from ${process.cwd()}`);
        return;
    }

    try {
        console.log(`[Provisioning] Running migrations from ${migrationsFolder}...`);
        try {
            await migrate(db, { migrationsFolder });
            console.log(`[Provisioning] Migrations applied successfully.`);
        } catch (e: any) {
            const code = e.code || e.cause?.code;
            const msg = e.message || e.cause?.message || "";

            if (code === '42P07' || msg.includes("already exists")) {
                console.warn('[Provisioning] Tables already exist (Migration skipped). Proceeding to seed defaults...');
            } else {
                console.error('[Provisioning] Migration failed:', e);
                throw e;
            }
        }

        // 3. Seed Default Data
        await seedDefaults(db, modules, tenantId);

    } catch (error) {
        console.error('[Provisioning] Error during provisioning:', error);
        throw error;
    } finally {
        await migrationClient.end();
    }
}

export async function seedDefaults(db: any, modules: string[], tenantId: string) {
    // 0. Seed tenantId into settings table
    console.log('[Provisioning] Seeding tenantId into settings table:', tenantId);
    await db
        .insert(settings)
        .values({
            name: 'tenantId',
            value: tenantId,
            group: 'system',
        })
        .onConflictDoNothing();

    // 1. Seed 'roles'
    if (modules.includes('role') || process.env.APP_MODE === "core") {
        const { roles } = await import('@heiso/core/lib/db/schema');

        // Check if any roles exist (each tenant has its own DB now)
        const existingRoles = await db.select().from(roles).limit(1);
        if (existingRoles.length === 0) {
            console.log('[Provisioning] Seeding "roles" table');
            await db.transaction(async (tx: any) => {
                for (const r of DEFAULT_ROLES) {
                    await tx.insert(roles).values({
                        name: r.name,
                        description: r.description,
                        fullAccess: r.fullAccess,
                    });
                }
            });
        } else {
            console.log(`[Provisioning] Roles already exist. Skipping.`);
        }
    }

    // 2. Seed 'navigations' (Feature Menus - Main Website/Nav)
    const existingNav = await db.select().from(navigations).limit(1);

    if (existingNav.length > 0) {
        console.log(`[Provisioning] Navigations already exist. Skipping.`);
        return;
    }

    console.log('[Provisioning] Seeding "navigations" table');
    await db.transaction(async (tx: any) => {
        const navId = generateNavigationId();
        const PLACEHOLDER_ACCOUNT_ID = '00000000-0000-0000-0000-000000000000';

        await tx.insert(navigations).values({
            id: navId,
            accountId: PLACEHOLDER_ACCOUNT_ID,
            slug: 'main',
            name: 'Main Menu',
            description: 'Default system generated menu',
        });
    });
}
