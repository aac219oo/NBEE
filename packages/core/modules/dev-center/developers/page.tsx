import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DeveloperList } from "./_components/developer-list";
import { getDevelopers } from "./_server/developer.service";

export default async function DeveloperPage() {
  const developers = await getDevelopers();
  const t = await getTranslations("devCenter.developers");

  return (
    <div className="flex w-full h-full bg-sub-background">
      <div className="main-section-item grow w-full overflow-hidden">
        <Suspense fallback={<div>{t("loading")}</div>}>
          <DeveloperList data={developers} />
        </Suspense>
      </div>
    </div>
  );
}
