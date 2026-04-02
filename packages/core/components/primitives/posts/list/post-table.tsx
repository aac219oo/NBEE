"use client";

import { useSite } from "@heiso/core/providers/site";
import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { Edit2, Link2, Star, UserRound } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@heiso/core/components/ui/tooltip";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  PostStatus,
  PostStatusBadge,
} from "@heiso/core/components/primitives/posts/post-status";
import { readableDate } from "@heiso/core/lib/utils/format";
import type { Menu } from "@heiso/core/types/system";
import { PostActions } from "./post-actions";
import { DataTable } from "@heiso/core/components/primitives/posts/data-table";

export type PostRow = {
  id: string;
  title: string;
  isPublished: string | null;
  updated: string;
  created: string;
  userId: { id: string; name: string };
  updater?: { id: string; name: string } | null;
  status: string;
  menus: Menu[];
  type?: string;
  slug?: string;
  sortOrder?: number;
};

export function PostTable({
  className,
  posts,
  onDelete,
  onDuplicate,
  onToggleStatus,
  onToggleHighlight,
  isPending,
  linkBase,
  globalFilter,
  translationItem,
  showVisualEditor,
  enableStickyColumns,
  buildFrontendLink,
  sorting,
  onSortingChange,
  manualSorting,
}: {
  className?: string;
  posts: PostRow[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => Promise<{ error?: string } | undefined>;
  onToggleStatus: (id: string, status: "hidden" | "draft") => Promise<void>;
  onToggleHighlight?: (id: string) => Promise<void>;
  isPending: boolean;
  linkBase?: string;
  globalFilter?: string;
  translationItem?: string;
  showVisualEditor?: boolean;
  enableStickyColumns?: boolean;
  buildFrontendLink?: (post: PostRow) => string | null;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
}) {
  const { site } = useSite();
  const tPosts = useTranslations("components.posts");
  const label = useTranslations("components.posts.list.label");
  const itemLabel = translationItem || tPosts("item");

  const frontendBase =
    site?.basic?.base_url ??
    (site?.basic?.domain ? `https://${site.basic.domain}` : null);
  const previewSecret = site?.deployment?.preview_secret;

  const defaultBuildLink = useCallback(
    (post: PostRow) => {
      const base = linkBase ?? "./post";

      const detail = buildFrontendLink
        ? buildFrontendLink(post)
        : frontendBase && previewSecret
          ? `${frontendBase.replace(/\/$/, "")}/api/preview?id=${post.id}&secret=${previewSecret}`
          : null;

      return {
        view: `${base}/${post.id}`,
        edit: `${base}/${post.id}/edit`,
        visual: `${base}/${post.id}/visual`,
        detail,
      };
    },
    [linkBase, frontendBase, previewSecret, buildFrontendLink],
  );

  const globalFilterFn = useCallback(
    (row: any, _columnId: string, filterValue: unknown) => {
      const q = String(filterValue ?? "")
        .toLowerCase()
        .trim();
      if (!q) return true;
      const title = String((row.original as PostRow).title ?? "").toLowerCase();
      return title.includes(q);
    },
    [],
  );

  const columns = useMemo<ColumnDef<PostRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: () => (
          <span className="capitalize">
            {label("title", { item: itemLabel })}
          </span>
        ),
        cell: ({ row }) => {
          const post = row.original;
          const links = defaultBuildLink(post);
          return (
            <div className="flex items-center gap-2">
              {post.sortOrder === 1 && (
                <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
              )}
              <Link href={links.edit} className="truncate">
                {post.title}
              </Link>
              {post.isPublished && post.status !== PostStatus.Hidden && (() => {
                const frontendLink = buildFrontendLink
                  ? buildFrontendLink(post)
                  : `${site?.basic?.base_url?.endsWith('/') ? site.basic.base_url.slice(0, -1) : site?.basic?.base_url || ''}${post.type ? `/${post.type}` : ''}${post.slug?.startsWith('/') ? post.slug : `/${post.slug || `pages/${post.id}`}`}`;
                return frontendLink ? (
                  <Link
                    href={frontendLink}
                    className="text-gray-500 ml-1"
                    target="_blank"
                  >
                    <Link2 className="size-3.5 " />
                  </Link>
                ) : null;
              })()}
            </div>
          );
        },
        sortingFn: "basic",
      },
      {
        accessorKey: "menus",
        header: () => label("menus"),
        cell: ({ row }) =>
          row.original.menus?.map((menu) => menu.title).join(", ") || "-",
      },
      {
        accessorKey: "userId",
        header: () => label("author"),
        cell: ({ row }) => {
          return (
            <span className="flex items-center gap-1">
              <UserRound className="size-4" />
              {row.original.userId?.name}
            </span>
          );
        },
        sortingFn: "basic",
      },
      {
        accessorKey: "updater",
        header: () => label("updater"),
        cell: ({ row }) => {
          return (
            <span className="flex items-center gap-1">
              <UserRound className="size-4" />
              {row.original.updater?.name ?? row.original.updater?.id ?? "-"}
            </span>
          );
        },
        sortingFn: "basic",
      },
      {
        accessorKey: "status",
        header: () => label("status"),
        cell: ({ row }) =>
          PostStatusBadge(row?.original?.status as PostStatus | null),
        sortingFn: "basic",
      },
      {
        accessorKey: "updated",
        header: () => label("updatedDate"),
        cell: ({ row }) => readableDate(row.original.updated),
        sortingFn: "datetime",
      },
      {
        accessorKey: "isPublished",
        header: () => label("publishedDate"),
        cell: ({ row }) => {
          const post = row.original?.isPublished;
          return post ? readableDate(post) : "-";
        },
        sortingFn: "datetime",
      },
      {
        id: "actions",
        header: () => label("actions"),
        cell: ({ row }) => {
          const post = row.original;
          const links = defaultBuildLink(post);
          return (
            <div className="w-full flex items-center justify-center gap-0.5">
              {showVisualEditor && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={links.visual}
                      className="flex items-center cursor-pointer p-1 hover:bg-muted rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>編輯</TooltipContent>
                </Tooltip>
              )}
              <PostActions
                post={post}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onToggleStatus={onToggleStatus}
                onToggleHighlight={onToggleHighlight}
                isPending={isPending}
                editLink={links.edit}
                detailLink={links.detail ?? undefined}
                frontendBaseUnconfigured={!frontendBase}
                previewSecretUnconfigured={!!frontendBase && !previewSecret}
              />
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [
      itemLabel,
      label,
      isPending,
      defaultBuildLink,
      onDelete,
      site?.basic?.base_url,
      onDuplicate,
      onToggleStatus,
      showVisualEditor,
    ],
  );

  return (
    <DataTable
      className={className}
      data={posts}
      columns={columns}
      enableStickyColumns={enableStickyColumns}
      sorting={sorting}
      onSortingChange={onSortingChange}
      manualSorting={manualSorting}
      globalFilter={globalFilter}
      globalFilterFn={globalFilterFn}
    />
  );
}
