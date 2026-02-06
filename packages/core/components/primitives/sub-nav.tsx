"use client";

import { cn } from "@heiso/core/lib/utils";
import type { SubNavProps } from "@heiso/core/types/client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function SubNav({ rootPath, className, title, groups }: SubNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className={cn("w-64 border-r bg-background", className)}>
      <h3 className="h-12 flex items-center px-6 text-lg font-semibold border-b">
        {title}
      </h3>

      <div className="space-y-0">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="px-3 py-4 border-t first:border-t-0">
            <h4 className="text-[10px] px-3 font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
              {group.title}
            </h4>
            <nav className="space-y-0.5">
              {group.items.map((item, itemIndex) => {
                const fullHref = `${rootPath}${item.href}`;
                const [itemPath, itemQuery] = item.href.split("?");

                let active = false;
                if (itemQuery) {
                  const itemParams = new URLSearchParams(itemQuery);
                  active = Array.from(itemParams.entries()).every(([key, value]) =>
                    searchParams.get(key) === value
                  );
                } else {
                  active = pathname === `${rootPath}${itemPath}`;
                }

                return (
                  <Link
                    key={itemIndex}
                    target={item.target}
                    href={fullHref}
                    className={cn(
                      "block px-3 py-1.5 text-sm rounded-md transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </div>
  );
}
