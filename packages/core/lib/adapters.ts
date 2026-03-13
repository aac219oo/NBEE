/**
 * Adapter interfaces and registry for decoupling @heiso/core from external services.
 *
 * Consumers (e.g., apps/cms) register adapters at bootstrap.
 * Core code uses these adapters via getter functions; if no adapter is registered,
 * the feature is disabled gracefully.
 */

// ============================================================================
// Type Definitions (mirrored from Hive for interface compatibility)
// ============================================================================

export type TenantTier = "BASIC" | "PREMIUM" | "ENTERPRISE" | "CUSTOM" | "INTERNAL_ADMIN";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface TenantConfig {
    id: string;
    name: string;
    slug: string;
    customDomain?: string | null;
    tier: TenantTier;
    status: TenantStatus;
    dbConnection?: string | null;
}

export interface ResolvedTenant {
    tenant: TenantConfig | null;
    subscriptions: Record<string, string[]>; // e.g., { 'cms': ['faq', 'blog'] }
    source: "cache" | "db";
}

export interface AdminUser {
    id: string;
    email: string;
    password: string;
    name: string;
    lastLoginAt: Date | null;
}

// ============================================================================
// Adapter Interfaces
// ============================================================================

/**
 * TenantAdapter - Handles tenant resolution and updates.
 * Used for multi-tenant routing and custom domain management.
 */
export interface TenantAdapter {
    resolveTenant(host: string): Promise<ResolvedTenant>;
    resolveSlug(slug: string): Promise<ResolvedTenant>;
    updateTenant(tenantId: string, data: Partial<TenantConfig>): Promise<void>;
}

/**
 * AdminAuthAdapter - Handles admin user authentication for Hive admin accounts.
 * Used for devlogin and global admin access.
 */
export interface AdminAuthAdapter {
    getAdminUser(email: string): Promise<AdminUser | null>;
    updateLastLogin(id: string): Promise<void>;
    updatePassword(email: string, passwordHash: string): Promise<void>;
}

/**
 * PlatformAccountAdapter - Handles platform account operations.
 * Used for account creation, updates, and password verification in CMS mode.
 */
export interface PlatformAccountAdapter {
    /**
     * Create a new account in Platform DB
     */
    createAccount(data: {
        email: string;
        name: string;
        password: string;
        active?: boolean;
    }): Promise<{
        id: string;
        email: string;
        name: string;
    }>;

    /**
     * Update account information
     */
    updateAccount(id: string, data: {
        name?: string;
        avatar?: string;
        email?: string;
        active?: boolean;
    }): Promise<void>;

    /**
     * Verify password for authentication
     */
    verifyPassword(email: string, password: string): Promise<boolean>;

    /**
     * Get account by email (includes password for authentication)
     */
    getAccountByEmail(email: string): Promise<{
        id: string;
        email: string;
        name: string;
        password: string;
        active: boolean;
        avatar?: string | null;
        lastLoginAt?: Date | null;
    } | null>;

    /**
     * Get account by ID (excludes password)
     */
    getAccountById(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        active: boolean;
        avatar?: string | null;
    } | null>;

    /**
     * Update account password
     */
    updatePassword(accountId: string, hashedPassword: string, mustChange?: boolean): Promise<void>;

    /**
     * Check if account is a Platform Developer
     */
    checkIsPlatformDeveloper(accountId: string): Promise<boolean>;

    /**
     * Create a dev account with developer role
     */
    createDevAccount(email: string, hashedPassword: string, name: string): Promise<{
        id: string;
        email: string;
        name: string;
        password: string;
        active: boolean;
        avatar?: string | null;
        lastLoginAt?: Date | null;
    }>;

    /**
     * Get or create account (for invite flow)
     * Returns account ID
     */
    getAccountWithCreate(data: { email: string; name?: string }): Promise<string>;
}

// ============================================================================
// Registry (Singleton Pattern)
// ============================================================================

let tenantAdapter: TenantAdapter | null = null;
let adminAuthAdapter: AdminAuthAdapter | null = null;
let platformAccountAdapter: PlatformAccountAdapter | null = null;

/**
 * Register a TenantAdapter implementation.
 * Call this at application bootstrap (e.g., in app layout or middleware).
 */
export function registerTenantAdapter(adapter: TenantAdapter): void {
    tenantAdapter = adapter;
}

/**
 * Register an AdminAuthAdapter implementation.
 * Call this at application bootstrap.
 */
export function registerAdminAuthAdapter(adapter: AdminAuthAdapter): void {
    adminAuthAdapter = adapter;
}

/**
 * Register a PlatformAccountAdapter implementation.
 * Call this at application bootstrap (e.g., in CMS app).
 */
export function registerPlatformAccountAdapter(adapter: PlatformAccountAdapter): void {
    platformAccountAdapter = adapter;
}

/**
 * Get the registered TenantAdapter.
 * Returns null if no adapter has been registered (feature disabled).
 */
export function getTenantAdapter(): TenantAdapter | null {
    return tenantAdapter;
}

/**
 * Get the registered AdminAuthAdapter.
 * Returns null if no adapter has been registered (feature disabled).
 */
export function getAdminAuthAdapter(): AdminAuthAdapter | null {
    return adminAuthAdapter;
}

/**
 * Get the registered PlatformAccountAdapter.
 * Returns null if no adapter has been registered (feature disabled).
 */
export function getPlatformAccountAdapter(): PlatformAccountAdapter | null {
    return platformAccountAdapter;
}

/**
 * Check if Hive integration is available (i.e., adapters are registered).
 */
export function isHiveAvailable(): boolean {
    return tenantAdapter !== null;
}
