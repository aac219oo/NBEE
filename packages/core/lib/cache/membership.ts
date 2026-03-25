import { unstable_cache } from 'next/cache'
import { findMembershipByAccountId } from '@heiso/core/modules/account/authentication/_server/auth.service'

/**
 * Cached version of findMembershipByAccountId().
 * Tag: `membership:{accountId}`
 */
export async function cachedFindMembershipByAccountId(accountId: string) {
    const cached = unstable_cache(
        () => findMembershipByAccountId(accountId),
        [`membership:${accountId}`],
        { tags: [`membership:${accountId}`] },
    )
    return cached()
}
