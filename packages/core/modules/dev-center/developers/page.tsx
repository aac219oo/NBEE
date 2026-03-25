import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@heiso/core/components/ui/skeleton";
import { DeveloperList } from "./_components/developer-list";
import { getDevelopers } from "./_server/developer.service";

export default async function DeveloperPage() {
  const developers = await getDevelopers();
  const t = await getTranslations("devCenter.developers");

  return (
    <div className="flex w-full h-full bg-sub-background">
      <div className="main-section-item grow w-full overflow-hidden">
        <Suspense fallback={<div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}>
          <DeveloperList data={developers} />
        </Suspense>
      </div>
    </div>
  );
}
