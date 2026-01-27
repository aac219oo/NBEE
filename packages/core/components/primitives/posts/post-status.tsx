import { Badge } from "@heiso/core/components/ui/badge";
import { useTranslations } from "next-intl";
import type { JSX } from "react";

export enum PostStatus {
  Draft = "draft",
  Hidden = "hidden",
  Published = "published",
  Editing = "editing",
}

export function PostStatusBadge(status: PostStatus | null): JSX.Element | null {
  const t = useTranslations("components.posts.status");

  switch (status) {
    case PostStatus.Draft:
      return <Badge status="draft">{t("draft")}</Badge>;
    case PostStatus.Hidden:
      return <Badge status="hidden">{t("hidden")}</Badge>;
    case PostStatus.Published:
      return <Badge status="green">{t("published")}</Badge>;
    case PostStatus.Editing:
      return <Badge status="blue">{t("editing")}</Badge>;
    case null:
      return null;
    default:
      return <Badge status="draft">-</Badge>;
  }
}
