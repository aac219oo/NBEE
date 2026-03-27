import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Extend types
declare module "next-auth" {
  interface Session {
    user: {
      platformStaff: boolean;
    } & DefaultSession["user"];
    member?: {
      status: string | null;
      isOwner: boolean;
      role: string | null;
      customRoleName: string | null;
      fullAccess: boolean;
    };
  }
  interface JWT {
    platformStaff?: boolean;
    member?: {
      status: string | null;
      role: string | null;
      customRoleName: string | null;
      fullAccess: boolean;
    } | null;
    memberUpdatedAt?: number | null;
  }

  interface User {
    platformStaff: boolean;
    member?: {
      status: string | null;
      role: string | null;
      customRoleName: string | null;
      fullAccess: boolean;
    } | null;
  }
}

class InvalidLoginError extends CredentialsSignin {
  code = "Invalid identifier or password";
}

export const ALLOWED_DEV_EMAILS = ["pm@heiso.io", "dev@heiso.io"];

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!account || account.provider === "credentials") return true;

        const email = (user?.email || (profile && (profile as any).email) || "")
          .toString()
          .trim();
        if (!email) return true;

        const { getAccountByEmail } = await import("@heiso/core/lib/platform/account-adapter");
        const account_ = await getAccountByEmail(email);
        if (!account_) return true;

        const { getDynamicDb } = await import("@heiso/core/lib/db/dynamic");
        const db = await getDynamicDb();
        const { and, eq, isNull } = await import("drizzle-orm");

        // 統一使用 accounts 表（Core 和 APPS 模式皆同）
        const { accounts } = await import("@heiso/core/lib/db/schema");

        const existingAccount = await db.query.accounts.findFirst({
          where: (t, ops) =>
            ops.and(ops.eq(t.id, account_.id), ops.isNull(t.deletedAt)),
          columns: { id: true, status: true, roleId: true },
        });

        // 若帳號狀態為 invited，更新為 active
        if (existingAccount && existingAccount.status === "invited") {
          await db
            .update(accounts)
            .set({
              inviteToken: null,
              inviteExpiredAt: null,
              status: "active",
              joinedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(eq(accounts.id, existingAccount.id), isNull(accounts.deletedAt)),
            );

          const { revalidateTag } = await import("next/cache");
          revalidateTag(`account:${email}`, "default");
          revalidateTag(`membership:${existingAccount.id}`, "default");
        }

        return true;
      } catch (err) {
        console.error("[OAuth signIn] pre-check failed:", err);
        return true;
      }
    },
    async jwt({ token, user, account, trigger, session: updateData }) {
      // Invalidate legacy tokens (missing platformStaff field)
      if (!user && token.platformStaff === undefined) {
        return {};
      }

      // Handle session update trigger (from unstable_update)
      if (trigger === "update" && updateData?.member) {
        token.member = updateData.member;
        token.memberUpdatedAt = Date.now();
        return token;
      }

      if (user) {
        token.platformStaff = (user as any).platformStaff ?? false;
        token.email = (user as any).email ?? (token as any).email;

        // Write membership from User object (set during authorize)
        token.member = (user as any).member ?? null;
        token.memberUpdatedAt = Date.now();

        // OAuth login: replace token.sub with Tenant DB account.id
        if (account && account.provider !== "credentials") {
          const email = (user.email || "").toString().trim();
          if (email) {
            try {
              const { getAccountByEmail } = await import("@heiso/core/lib/platform/account-adapter");
              const dbAccount = await getAccountByEmail(email);
              if (dbAccount) {
                token.sub = dbAccount.id;
                // Query membership for OAuth user
                const { findMembershipByAccountId } = await import(
                  "@heiso/core/modules/account/authentication/_server/auth.service"
                );
                const membership = await findMembershipByAccountId(dbAccount.id);
                token.member = membership ? {
                  status: membership.status,
                  role: membership.role,
                  customRoleName: membership.customRole ? (membership.customRole as any)[1] : null,
                  fullAccess: membership.role === 'owner' || !!(membership.customRole && (membership.customRole as any)[2]),
                } : { status: null, role: null, customRoleName: null, fullAccess: false };
                token.memberUpdatedAt = Date.now();
              }
            } catch (e) {
              console.warn("[jwt] OAuth account lookup failed:", e);
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          platformStaff: (token.platformStaff as boolean) ?? false,
          id: token.sub!,
        };
      }

      // Platform staff: grant full access without membership
      if (token.platformStaff) {
        session.member = {
          status: 'active',
          isOwner: false,
          role: null,
          customRoleName: null,
          fullAccess: true,
        };
        return session;
      }

      // Read membership from token (no DB query)
      const memberData = token.member as { status: string | null; role: string | null; customRoleName: string | null; fullAccess: boolean } | null | undefined;
      if (memberData && 'status' in memberData) {
        session.member = {
          status: memberData.status,
          isOwner: memberData.role === 'owner',
          role: memberData.role,
          customRoleName: memberData.customRoleName,
          fullAccess: memberData.fullAccess,
        };
      } else {
        // Legacy token fallback
        session.member = {
          status: null,
          isOwner: false,
          role: null,
          customRoleName: null,
          fullAccess: false,
        };
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        if (urlObj.origin === baseUrlObj.origin) return url;
        const isSameRootDomain = urlObj.hostname.endsWith(baseUrlObj.hostname) ||
          baseUrlObj.hostname.endsWith(urlObj.hostname);
        const isSamePort = urlObj.port === baseUrlObj.port;
        if (isSameRootDomain && isSamePort) return url;
      } catch (e) { }
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      // OAuth Logic
      try {
        if (!account || account.provider === "credentials") return;

        const email = (user?.email || (profile && (profile as any).email) || "")
          .toString()
          .trim();
        console.log("[OAuth signIn] provider:", account.provider);

        if (!email) return;

        const { getAccountByEmail } = await import("@heiso/core/lib/platform/account-adapter");
        const existingAccount = await getAccountByEmail(email);

        if (!existingAccount) {
          // Core 模式：需要先創建帳號
          // APPS 模式：帳號需要在 Platform DB 建立
          console.warn("[OAuth signIn] Account not found, needs to be created");
          return;
        }

        const { getDynamicDb } = await import("@heiso/core/lib/db/dynamic");
        const { eq } = await import("drizzle-orm");
        const db = await getDynamicDb();

        // 統一使用 accounts 表（Core 和 APPS 模式皆同）
        const { accounts } = await import("@heiso/core/lib/db/schema");

        // 查找帳號
        const account_ = await db.query.accounts.findFirst({
          where: (t, ops) => ops.and(ops.eq(t.id, existingAccount.id), ops.isNull(t.deletedAt)),
        });

        if (account_) {
          // 更新帳號
          await db
            .update(accounts)
            .set({ updatedAt: new Date(), lastLoginAt: new Date() })
            .where(eq(accounts.id, account_.id));
        } else {
          // 這種情況通常不會發生，因為 getAccountByEmail 已經找到帳號
          console.warn("[OAuth signIn] Account record not found");
        }
      } catch (err) {
        console.error("[OAuth signIn] member upsert failed:", err);
      }
    },
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: { params: { prompt: "login" } },
    }),
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
        email: { label: "Email" },
        otpVerified: { label: "OTP Verified" },
        userId: { label: "User ID" },
        isDevLogin: { label: "Is Dev Login" },
      },
      async authorize(credentials, _req) {
        // DevLogin OTP path (platform staff)
        // OTP already verified by verifyDevOTP, trust the result
        if (credentials?.otpVerified === "true") {
          const email = String(credentials?.email || "");
          const accountId = String(credentials?.userId || "");
          if (!email || !accountId) throw new InvalidLoginError();

          const isDevLogin = credentials?.isDevLogin === "true";
          const isAllowedDevEmail = ALLOWED_DEV_EMAILS.includes(email);

          if (isDevLogin && isAllowedDevEmail) {
            // Platform staff: account is in HIVE DB, not Tenant DB
            return {
              id: accountId,
              name: email.split("@")[0],
              email,
              platformStaff: true,
              member: null,
            };
          }

          // Non-dev OTP login: verify account in Tenant DB
          const { getAccount } = await import("./_server/user.service");
          const account = await getAccount(accountId);
          if (!account || account.email !== email) throw new InvalidLoginError();

          return {
            id: account.id,
            name: account.name,
            email: account.email,
            platformStaff: false,
            member: {
              status: (account as any).status ?? null,
              role: (account as any).role ?? null,
              customRoleName: null,
              fullAccess: (account as any).role === 'owner',
            },
          };
        }

        // Standard login: Tenant DB only
        if (!credentials?.username || !credentials?.password) throw new InvalidLoginError();
        const { username, password: pwd } = credentials as { username: string; password: string };

        const {
          getAccountByEmail,
          verifyPassword: verifyAccountPassword,
        } = await import("@heiso/core/lib/platform/account-adapter");

        const account = await getAccountByEmail(username);
        if (!account) throw new InvalidLoginError();

        const isPasswordValid = await verifyAccountPassword(username, pwd);
        if (!isPasswordValid) throw new InvalidLoginError();

        // Query membership info for JWT
        const memberData = {
          status: (account as any).status ?? null,
          role: (account as any).role ?? null,
          customRoleName: null as string | null,
          fullAccess: (account as any).role === 'owner',
        };

        // Resolve customRole if roleId exists
        if ((account as any).roleId) {
          try {
            const { getDynamicDb } = await import("@heiso/core/lib/db/dynamic");
            const db = await getDynamicDb();
            const { roles } = await import("@heiso/core/lib/db/schema");
            const { eq } = await import("drizzle-orm");
            const customRole = await db.query.roles.findFirst({
              where: eq(roles.id, (account as any).roleId),
              columns: { name: true, fullAccess: true },
            });
            if (customRole) {
              memberData.customRoleName = customRole.name;
              memberData.fullAccess = memberData.fullAccess || customRole.fullAccess;
            }
          } catch (e) {
            console.warn("[authorize] customRole lookup failed:", e);
          }
        }

        return {
          id: account.id,
          name: account.name,
          email: account.email,
          platformStaff: false,
          member: memberData,
        };
      },
    }),
  ],
});
