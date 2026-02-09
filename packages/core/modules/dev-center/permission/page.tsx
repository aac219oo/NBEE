import { CaptionTotal } from "@heiso/core/components/shared/caption-total";
import { permissionsConfig, type PermissionConfigShape } from "@heiso/core/config/permissions";
import { Suspense } from "react";
import { getMenus } from "@heiso/core/modules/dev-center/permission/_server/menu.service";
import {
  getPermissions,
  groupPermissionsByMenu,
} from "@heiso/core/modules/dev-center/permission/_server/permission.service";
import { PermissionListContent } from "./_components/permission-list-content";

export default async function PermissionPage() {
  const menus = await getMenus();

  // 使用 config/permissions.ts 的靜態資料，並對應 menu id
  const permissions = (permissionsConfig as readonly PermissionConfigShape[]).map((p) => {
    return {
      id: p.id,
      resource: p.resource,
      action: p.action,
      menuId: p.menu?.id ?? null,
    };
  });
  const dbPermissions = await getPermissions();
  const permissionGroups = await groupPermissionsByMenu(
    menus,
    permissions,
    dbPermissions,
  );

  const totalPermissions = permissionGroups.reduce(
    (acc, g) => acc + g.permissions.length,
    0,
  );

  return (
    <div className="container m-auto max-w-6xl justify-start py-10 p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <CaptionTotal title="Permissions" total={totalPermissions} />
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <PermissionListContent groups={permissionGroups} />
      </Suspense>
    </div>
  );
}
