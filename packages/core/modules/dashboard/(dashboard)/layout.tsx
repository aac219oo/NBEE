import { Layout } from "@heiso/core/components/primitives/layout";
import type { UserAvatarMenuItem } from "@heiso/core/components/primitives/user-avatar";
import { LayoutSkeleton } from "@heiso/core/components/skeleton";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { PermissionProvider } from "@heiso/core/providers/permission";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getMyMembership, getMyAllowedMenuIds } from "./_server/membership.service";
import { buildDashboardNavigation } from "./dashboard-config";

interface OrgLayoutProps {
  children: React.ReactNode;
}

export default async function OrgLayout({ children }: OrgLayoutProps) {
  // Authentication check
  const session = await auth();
  if (!session?.user) return null;

  // Get organization data
  return (
    <Suspense fallback={<LayoutSkeleton />}>
      <OrgLayoutWrap>{children}</OrgLayoutWrap>
    </Suspense>
  );
}

async function OrgLayoutWrap({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user membership and permissions
  const membership = await getMyMembership();

  const hasFullAccess =
    membership.platformStaff === true ||
    membership.role === 'owner' ||
    membership.customRole?.fullAccess === true;

  // Get translations
  const t = await getTranslations("dashboard.userMenu");
  const tn = await getTranslations("dashboard.nav");

  // Build navigation menu from generated config
  const allowedMenuIds = await getMyAllowedMenuIds({
    fullAccess: hasFullAccess,
    roleId: membership?.roleId,
  });

  // Build navigation from generated config, filtered by allowed IDs
  const navigation = buildDashboardNavigation(
    allowedMenuIds,
    (key) => tn(key),
  );

  const userAvatarMenu = [
    {
      id: "user",
      type: "Group",
      group: [
        {
          id: "accountSettings",
          text: t("accountSettings"),
          href: "/account/me",
          type: "Link",
        },
      ],
    },
    {
      id: "separator2",
      type: "Separator",
    },
    {
      id: "logOut",
      text: t("logOut"),
      type: "LogOut",
    },
  ] satisfies UserAvatarMenuItem[];

  if (membership.platformStaff) {
    userAvatarMenu[0].group?.push({
      id: "dev-center",
      text: t("developer"),
      href: "/dev-center",
      type: "Link",
    });
  }

  return (
    <PermissionProvider>
      <Layout navigation={navigation} menu={userAvatarMenu}>
        {children}
      </Layout>
    </PermissionProvider>
  );
}
