import { verifyPassword } from "@heiso/core/lib/hash";
import NextAuth, { CredentialsSignin, type DefaultSession, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Extend types
declare module "next-auth" {
  interface Session {
    user: {
      isDeveloper: boolean;
      isAdminUser?: boolean;
    } & DefaultSession["user"];
    member?: {
      status: string | null;
      isOwner: boolean;
      roleName: string | null;
      fullAccess: boolean;
    };
  }
  interface JWT {
    isDeveloper?: boolean;
    memberStatus?: string | null;
    isAdminUser?: boolean;
  }

  interface User {
    isDeveloper: boolean;
    isAdminUser?: boolean;
  }
}

class InvalidLoginError extends CredentialsSignin {
  code = "Invalid identifier or password";
}

export const ALLOWED_DEV_EMAILS = ["pm@heiso.io", "dev@heiso.io"];

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        }

        return true;
      } catch (err) {
        console.error("[OAuth signIn] pre-check failed:", err);
        return true;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.isDeveloper = (user as any).isDeveloper;
        token.isAdminUser = (user as any).isAdminUser;
        token.email = (user as any).email ?? (token as any).email;

        // OAuth 登入：將 token.sub 替換為資料庫中的 account.id
        if (account && account.provider !== "credentials") {
          const email = (user.email || "").toString().trim();
          if (email) {
            try {
              const { getAccountByEmail } = await import("@heiso/core/lib/platform/account-adapter");
              const dbAccount = await getAccountByEmail(email);
              if (dbAccount) {
                token.sub = dbAccount.id;
              }
            } catch (e) {
              console.warn("[jwt] OAuth account lookup failed:", e);
            }
          }
        }
      }

      // Admin User Strategy: Skip Core membership check
      if (token.isAdminUser) {
        return token;
      }

      try {
        const accountId = token.sub;
        if (accountId) {
          const { findMembershipByAccountId } = await import(
            "@heiso/core/modules/account/authentication/_server/auth.service"
          );
          const membership = await findMembershipByAccountId(accountId);
          (token as any).memberStatus = membership?.status ?? null;
        }
      } catch (e) {
        console.warn("[jwt] attach memberStatus failed:", e);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          isDeveloper: token.isDeveloper as boolean,
          isAdminUser: token.isAdminUser as boolean,
          id: token.sub!,
        };
      }

      // Admin User Strategy: Grant All Permissions
      if (token.isAdminUser) {
        session.member = {
          status: 'active',
          isOwner: true,
          roleName: 'Admin',
          fullAccess: true,
        };
        return session;
      }

      try {
        const accountId = session.user?.id;
        console.log("[session] accountId:", accountId);
        if (accountId) {
          const { findMembershipByAccountId } = await import(
            "@heiso/core/modules/account/authentication/_server/auth.service"
          );
          const membership = await findMembershipByAccountId(accountId);
          console.log("[session] membership:", membership);

          session.member = {
            status: membership?.status ?? null,
            isOwner: membership?.role === 'owner',
            roleName: membership?.role ?? null,
            fullAccess: membership?.role === 'owner' || membership?.role === 'admin',
          };
        }
      } catch (e) {
        console.warn("[session] attach member failed:", e);
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
      // Admin User Logic (Skip in Core Mode)
      if (process.env.APP_MODE !== "core" && account?.provider === "credentials" && (user as any).isAdminUser) {
        try {
          const { getAdminAuthAdapter } = await import("@heiso/core/lib/adapters");
          const adminAuth = getAdminAuthAdapter();
          if (adminAuth) {
            await adminAuth.updateLastLogin(user.id!);
          }
        } catch (e) {
          console.error("[Admin signIn] Failed to update lastLoginAt", e);
        }
        return;
      }

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
        if (credentials?.otpVerified === "true") {
          const email = String(credentials?.email || "");
          const accountId = String(credentials?.userId || "");
          if (!email || !accountId) throw new InvalidLoginError();

          const { getAccount } = await import("./_server/user.service");
          const account = await getAccount(accountId);
          if (!account || account.email !== email) throw new InvalidLoginError();

          // DevLogin OTP: Grant admin permissions for allowed emails
          const isDevLogin = credentials?.isDevLogin === "true";
          const isAllowedDevEmail = ALLOWED_DEV_EMAILS.includes(email);

          return {
            id: account.id,
            name: account.name,
            email: account.email,
            isDeveloper: (isDevLogin && isAllowedDevEmail),
            isAdminUser: (isDevLogin && isAllowedDevEmail) ? true : undefined,
          };
        }

        if (!credentials?.username || !credentials?.password) throw new InvalidLoginError();
        const { username, password } = <{ username: string; password: string }>credentials;

        // 1. Try Account (根據 APP_MODE 使用 accounts 或 foreignAccounts)
        const {
          getAccountByEmail,
          verifyPassword: verifyAccountPassword,
        } = await import("@heiso/core/lib/platform/account-adapter");

        let account = null;
        try {
          account = await getAccountByEmail(username);
          if (account) {
            const isPasswordValid = await verifyAccountPassword(username, password);
            if (isPasswordValid) {
              return {
                id: account.id,
                name: account.name,
                email: account.email,
                isDeveloper: false,
                isAdminUser: false,
              } as User;
            }
          }
        } catch (e) {
          // CMS 模式下會拋出錯誤，繼續嘗試其他方式
          console.warn("[Credentials] Account adapter failed:", e);
        }

        // 2. Try Hive Admin User (Skip in Core Mode)
        if (process.env.APP_MODE !== "core") {
          try {
            const { getAdminAuthAdapter } = await import("@heiso/core/lib/adapters");
            const adminAuth = getAdminAuthAdapter();
            if (adminAuth) {
              const adminUser = await adminAuth.getAdminUser(username);
              if (adminUser) {
                const isMatch = await verifyPassword(password, adminUser.password);
                if (isMatch) {
                  return {
                    id: adminUser.id,
                    name: adminUser.name,
                    email: adminUser.email,
                    isDeveloper: true,
                    isAdminUser: true,
                  } as User;
                }
              }
            }
          } catch (e) {
            console.error("Hive Login Check Failed", e);
          }
        }

        // 3. Dev Login bypass for allowed emails
        const isRefDevLogin = (credentials as any)?.isDevLogin === "true";
        const isCoreAdminBypass =
          process.env.APP_MODE === "core" &&
          ALLOWED_DEV_EMAILS.includes(username) &&
          isRefDevLogin;

        if (isCoreAdminBypass && account) {
          return {
            id: account.id,
            name: account.name ?? username,
            email: account.email ?? username,
            isDeveloper: true,
            isAdminUser: true,
          };
        }

        throw new InvalidLoginError();
      },
    }),
  ],
});
