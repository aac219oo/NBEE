import config from "@heiso/core/config";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { hasAnyUser } from "@heiso/core/server/services/auth";
import {
  getGeneralSettings,
  getSiteSettings,
} from "@heiso/core/server/services/system/setting";
import { redirect } from "next/navigation";
import { Login } from "../_components";
import InitializeTenantForm from "../_components/InitializeTenantForm";
import {
  checkTenantHasOwner,
  ensureMemberReviewOnFirstLogin,
  getMember,
} from "../_server/user.service";
import { headers } from "next/headers";
import { provisionTenantDb, seedDefaults } from "@heiso/core/modules/system/provisioning";
import { db } from "@heiso/core/lib/db";

export type OAuthDataType = {
  userId: string | null;
  email: string | null;
  status: string | null;
};
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ join?: string; relogin?: string; error?: string }>;
}) {
  /* 
   * Only check for owner if we are in a tenant context.
   * On Root Domain (x-tenant-id missing), we show standard login.
   */
  const { getTenantId } = await import("@heiso/core/lib/utils/tenant");
  const tenantId = await getTenantId();

  if (tenantId) {
    let hasOwner = false;
    let needsProvisioning = false;

    try {
      hasOwner = await checkTenantHasOwner(tenantId);
      // If table exists but no owner, it might mean partial initialization or just new tenant.
      // We should arguably run provisioning here too to ensure menus/defaults exist.
      if (!hasOwner) {
        needsProvisioning = true;
      }
    } catch (e: any) {
      // 42P01: undefined table (Schema missing)
      if (e.code === "42P01") {
        needsProvisioning = true;
      } else {
        throw e;
      }
    }

    if (needsProvisioning) {
      // In Core Mode, skip Hive provisioning to avoid dependencies
      if (process.env.APP_MODE === "core") {
        console.warn("[Login] Tenant uninitialized in Core Mode. Seeding defaults locally...");

        // In Core Mode, we pass empty modules list because seedDefaults handles CORE_DEFAULT_MENUS internally
        await seedDefaults(db, [], tenantId);
      } else {
        console.log(`[Login] Tenant ${tenantId} uninitialized. Provisioning via Hive...`);

        const { getTenantAdapter } = await import("@heiso/core/lib/adapters");
        const tenantAdapter = getTenantAdapter();

        if (!tenantAdapter) {
          console.error("[Login] Cannot provision: TenantAdapter not registered.");
          return;
        }

        const h = await headers();
        const host = h.get("host") || "";
        const resolved = await tenantAdapter.resolveTenant(host);

        const cmsModules = resolved.subscriptions['cms'] || [];
        const modules = cmsModules.length > 0 ? cmsModules : ["cms"];

        const dbUrl = resolved.tenant?.dbConnection || process.env.DATABASE_URL;

        if (dbUrl) {
          await provisionTenantDb(dbUrl, modules, tenantId);
        } else {
          console.error("[Login] Cannot provision: No DATABASE_URL found.");
        }
      }
    }

    // Re-check owner status after provisioning
    if (!hasOwner) {
      return (
        <div className="w-full max-w-md space-y-10">
          <InitializeTenantForm />
        </div>
      );
    }
  }

  const anyUser = await hasAnyUser();
  const general = await getGeneralSettings();
  const site = await getSiteSettings();
  const orgName =
    (site as any)?.branding?.organization || config?.site?.organization;

  const session = await auth(); // oAuth 登入
  let email = "";
  let oAuthData: OAuthDataType | undefined;

  // 使用 oAuth 有可能會遇到第三方不願意給 email
  const { relogin, error } = (await searchParams) ?? {};
  const isRelogin = !!relogin;
  if (session?.user && !isRelogin) {
    const userId = session.user.id ?? undefined;
    const sessionEmail = session.user.email ?? undefined;

    // Fix: Verify if user really exists in DB (Zombie Session Check)
    if (sessionEmail) {
      const { getUser } = await import("../_server/user.service");
      const dbUser = await getUser(sessionEmail);
      if (!dbUser) {
        // User in session but not in DB. Force logout.
        redirect("/api/auth/signout");
      }
    }

    // 開發人員直接進 Dashboard
    if (session.user.isDeveloper) {
      redirect("/dashboard");
    }

    const member = await getMember({ id: userId, email: sessionEmail });

    if (member) {
      oAuthData = member;
      // 已加入：直接進 Dashboard
      if (member.status === "joined") {
        redirect("/dashboard");
      }

      // 非 joined：如無錯誤參數才導向 Pending；有錯誤時留在 login 顯示錯誤
      if (!error) {
        redirect(`/pending?error=${error}`);
      }
    } else {
      // 無成員紀錄：第一次登入，建立/刷新 member 並設為 review，不寄送 email
      if (sessionEmail) {
        try {
          await ensureMemberReviewOnFirstLogin(sessionEmail, userId);
          const refreshed = await getMember({ email: sessionEmail });
          if (refreshed) {
            oAuthData = refreshed;
          }
          email = sessionEmail;
        } catch {
          email = sessionEmail;
        }
      }
    }
  }

  return (
    <div className="w-full max-w-md space-y-10">
      <Login
        email={email}
        anyUser={anyUser}
        orgName={orgName}
        oAuthData={oAuthData}
        systemOauth={general.system_oauth as string}
      />
    </div>
  );
}
