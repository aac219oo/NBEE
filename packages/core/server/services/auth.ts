"use server";

import { signIn, signOut } from "@heiso/core/modules/auth/auth.config";
import {
  hasAnyAccount,
  verifyPassword,
} from "@heiso/core/lib/platform/account-adapter";

export async function login(username: string, password: string) {
  try {
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    return true;
  } catch (error: any) {
    if (
      error?.message === "NEXT_REDIRECT" ||
      error?.digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Error during login:", error);
    return false;
  }
}

/**
 * Verify user password without creating a session.
 */
export async function verifyPasswordOnly(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    return await verifyPassword(email, password);
  } catch (error) {
    console.error("Error during verifyPasswordOnly:", error);
    return false;
  }
}

/**
 * Account creation
 * Core mode: Create in local accounts table
 * CMS mode: Requires Platform API
 */
export async function signup(input: {
  name?: string;
  email: string;
  password: string;
}): Promise<{ id: string; name: string } | null> {
  try {
    const { createAccount } = await import(
      "@heiso/core/lib/platform/account-adapter"
    );
    const account = await createAccount({
      email: input.email,
      name: input.name || input.email.split("@")[0],
      password: input.password,
      status: "active",
      role: "member",
    });
    return { id: account.id, name: account.name };
  } catch (error) {
    console.error("Error during signup:", error);
    return null;
  }
}

export async function logout() {
  try {
    await signOut({
      redirect: false,
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return false;
  }
}

/**
 * Check if there is at least one account.
 */
export async function hasAnyUser() {
  return await hasAnyAccount();
}

export const oAuthLogin = async (provider: string) => {
  await signIn(provider);
};

export const oAuthLogout = async () => {
  await signOut({ redirectTo: "/" });
};
