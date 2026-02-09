import { ClientRedirect } from "@heiso/core/components/primitives/redirect.client";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getMyMembership,
  getMyAllowedMenuIds,
  getUser,
} from "./_server/membership.service";
import { buildDashboardNavigation } from "./dashboard-config";

export default async function DashboardPage() {
  const headerList = await headers();
  const pathname = headerList.get("x-current-pathname");

  const session = await auth();
  if (!session?.user) return null;

  const me = await getUser();
  if (me?.mustChangePassword) {
    redirect("/auth/change-password");
  }

  const membership = await getMyMembership();
  const hasFullAccess =
    membership.isDeveloper === true ||
    membership.isOwner === true ||
    membership.role?.fullAccess === true;

  // Get allowed menu IDs and build navigation from static config
  const allowedMenuIds = await getMyAllowedMenuIds({
    fullAccess: hasFullAccess,
    roleId: membership?.roleId,
  });

  const navigation = buildDashboardNavigation(allowedMenuIds);

  // Get first menu item for redirect
  const firstItem = navigation.items[0];
  const firstPath = Array.isArray(firstItem) ? firstItem[0]?.path : firstItem?.path;

  if (
    (pathname === "/dashboard" || pathname === "/dashboard/") &&
    firstPath
  ) {
    return <ClientRedirect url={`/dashboard${firstPath}`} />;
  }

  return null;
}
