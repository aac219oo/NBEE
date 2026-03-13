/**
 * @deprecated RLS 已棄用。每個 Tenant 現在使用獨立的 DB，不再需要 Row-Level Security。
 * 此檔案保留以維持向後相容，但所有函數都是 no-op。
 */

/**
 * @deprecated RLS 已棄用
 */
export async function setTenantContext(_tenantId: string) {
    console.warn('[DEPRECATED] setTenantContext is no longer used. Each tenant has its own DB.');
}

/**
 * @deprecated RLS 已棄用
 */
export async function resetTenantContext() {
    console.warn('[DEPRECATED] resetTenantContext is no longer used. Each tenant has its own DB.');
}

/**
 * @deprecated RLS 已棄用
 */
export async function ensureTenantContext() {
    console.warn('[DEPRECATED] ensureTenantContext is no longer used. Each tenant has its own DB.');
}
