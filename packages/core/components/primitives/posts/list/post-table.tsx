"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@heiso/core/components/ui/table";
import { useSite } from "@heiso/core/providers/site";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@udecode/cn";
import { Edit2, Link2, UserRound } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@heiso/core/components/ui/tooltip";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import {
  PostStatus,
  PostStatusBadge,
} from "@heiso/core/components/primitives/posts/post-status";
import { readableDate } from "@heiso/core/lib/utils/format";
import type { Menu } from "@heiso/core/types/system";
import { PostActions } from "./post-actions";

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
};

export function PostTable({
  className,
  posts,
  onDelete,
  onDuplicate,
  onToggleStatus,
  isPending,
  linkBase,
  globalFilter,
  translationItem,
  showVisualEditor,
}: {
  className?: string;
  posts: PostRow[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => Promise<{ error?: string } | undefined>;
  onToggleStatus: (id: string, status: "hidden" | "draft") => Promise<void>;
  isPending: boolean;
  linkBase?: string;
  globalFilter?: string;
  translationItem?: string;
  /** 是否顯示 Visual Editor 入口按鈕 */
  showVisualEditor?: boolean;
}) {
  const { site } = useSite();
  const tPosts = useTranslations("components.posts");
  const label = useTranslations("components.posts.list.label");
  const itemLabel = translationItem || tPosts("item");
  const [sorting, setSorting] = useState<SortingState>([]);

  const defaultBuildLink = useCallback(
    (post: PostRow) => {
      const base = linkBase ?? "./post";
      return {
        view: `${base}/${post.id}`,
        edit: `${base}/${post.id}/edit`,
        visual: `${base}/${post.id}/visual`,
      };
    },
    [linkBase],
  );

  const _computeStatus = useCallback((post: PostRow): PostStatus => {
    if (post.status === PostStatus.Hidden) return PostStatus.Hidden;

    const p = post.isPublished ? new Date(post.isPublished).getTime() : null;
    const u = post.updated ? new Date(post.updated).getTime() : null;

    if (p && u && u > p) return PostStatus.Editing;
    if (p) return PostStatus.Published;
    return PostStatus.Draft;
  }, []);

  // 全域搜尋：僅比對標題
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
              <Link href={links.view} className="truncate">
                {post.title}
              </Link>
              {post.isPublished && post.status !== PostStatus.Hidden && (
                <Link
                  href={`${site?.basic.base_url?.endsWith('/') ? site.basic.base_url.slice(0, -1) : site?.basic.base_url || ''}${post.type ? `/${post.type}` : ''}${post.slug?.startsWith('/') ? post.slug : `/${post.slug || `pages/${post.id}`}`}`}
                  className="text-gray-500 ml-1"
                  target="_blank"
                >
                  <Link2 className="size-3.5 " />
                </Link>
              )}
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
              {/* <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={links.edit}
                    className="flex items-center cursor-pointer p-1 hover:bg-muted rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>編輯</TooltipContent>
              </Tooltip> */}
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
                isPending={isPending}
                editLink={links.edit}
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

  const table = useReactTable({
    data: posts,
    columns,
    state: {
      sorting,
      globalFilter: globalFilter ?? "",
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
  });

  return (
    <Table className={cn("space-y-3 text-muted-foreground", className)}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const isSortable = header.column.getCanSort();
              const sorted = header.column.getIsSorted(); // false | 'asc' | 'desc'
              return (
                <TableHead
                  key={header.id}
                  isSortable={isSortable}
                  sorted={sorted}
                  handleSort={header.column.getToggleSortingHandler()}
                  className="select-none"
                  isCenter={header.column.id === "actions"}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="h-full">
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className="min-w-24 max-w-56 truncate pr-2.5 last:pr-0"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
