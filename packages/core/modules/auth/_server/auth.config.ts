import { verifyPassword } from "@heiso/core/lib/hash";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getAccountByEmail, getAccountWithPasswordByEmail } from "./user.service";

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  callbacks: {
    async jwt({ token, user }) {
      // Invalidate legacy tokens (missing platformStaff field)
      if (!user && token.platformStaff === undefined) {
        return {};
      }

      if (user) {
        token.platformStaff = (user as any).platformStaff ?? false;
        token.member = (user as any).member ?? null;
        token.memberUpdatedAt = Date.now();
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
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
        email: { label: "Email" },
        otpVerified: { label: "OTP Verified" },
        userId: { label: "User ID" },
      },
      async authorize(credentials) {
        // Handle OTP verification flow
        if (credentials?.otpVerified === "true" && credentials?.userId) {
          const account = await getAccountByEmail(credentials.email as string);
          if (!account || account.id !== credentials.userId) {
            throw new InvalidLoginError();
          }
          return {
            id: account.id,
            name: account.name ?? "",
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

        // Handle traditional username/password flow
        if (!credentials?.username || !credentials?.password) {
          throw new InvalidLoginError();
        }

        const { username, password } = <{ username: string; password: string }>(
          credentials
        );
        const account = await getAccountWithPasswordByEmail(username);

        if (!account || !account.password) {
          throw new InvalidLoginError();
        }

        const isMatch = await verifyPassword(password, account.password);
        if (!isMatch) {
          throw new InvalidLoginError();
        }

        return {
          id: account.id,
          name: account.name ?? "",
          email: account.email,
          platformStaff: false,
          member: {
            status: (account as any).status ?? null,
            role: (account as any).role ?? null,
            customRoleName: null,
            fullAccess: (account as any).role === 'owner',
          },
        };
      },
    }),
  ],
});
