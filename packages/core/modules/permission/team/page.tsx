import { TableSkeleton } from "@heiso/core/components/skeleton";
import { Suspense } from "react";
import { MemberList } from "./_components/member-list";
import { getRoles } from "./_server/role.service";
import { getTeamMembers } from "./_server/team.service";
import { getMenus } from "../../dev-center/permission/_server/menu.service";

export default async function Team() {
  return (
    <div className="flex w-full h-full bg-sub-background">
      <div className="main-section-item grow w-full overflow-hidden">
        <Suspense fallback={<TableSkeleton />}>
          <TeamManagement />
        </Suspense>
      </div>
    </div>
  );
}

async function TeamManagement() {
  const [members, roles, menus] = await Promise.all([
    getTeamMembers(), 
    getRoles(),
    getMenus()
  ]);
  return <MemberList data={members} roles={roles} menus={menus} />;
}
