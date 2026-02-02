"use client";

import { useSite } from "@heiso/core/providers/site";
import Link from "next/link";
import { cn } from "@heiso/core/lib/utils";
// import config from '@heiso/core/config';

export function Logo({
  href = "/",
  hasTitle = true,
  title,
  classNames,
}: {
  href?: string;
  hasTitle?: boolean;
  title?: string;
  badge?: string;
  classNames: {
    main?: string;
    img?: string;
    badge?: string;
    text?: string;
  };
}) {
  const { site } = useSite();

  const logoSrc = site?.assets?.logo?.trim()
    ? site.assets.logo.startsWith("http") || site.assets.logo.startsWith("/")
      ? site.assets.logo
      : `/${site.assets.logo}`
    : "/images/logo.png";

  return (
    <Link
      href={href}
      className={classNames.main}
      title={title ?? site?.basic?.title ?? ""}
    >
      <img
        src={logoSrc}
        alt={title ?? site?.basic?.title ?? "Logo"}
        className={cn(
          "object-contain transition-all duration-300",
          classNames.img ?? "h-8 w-auto text-primary"
        )}
        loading="eager"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      {hasTitle && (
        <div className={classNames.text ?? "text-lg font-bold"}>
          {title ?? site?.basic?.title}
        </div>
      )}
    </Link>
  );
}
