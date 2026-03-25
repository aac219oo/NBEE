import { unstable_cache } from 'next/cache'
import { getAccountByEmail } from '@heiso/core/lib/platform/account-adapter'
import type { TAccount } from '@heiso/core/lib/db/schema/auth/accounts'

/**
 * Cached version of getAccountByEmail().
 * Tag: `account:{email}`
 */
export async function cachedGetAccountByEmail(
    email: string,
): Promise<TAccount | null> {
    const cached = unstable_cache(
        () => getAccountByEmail(email),
        [`account:${email}`],
        { tags: [`account:${email}`] },
    )
    return cached()
}
