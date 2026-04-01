"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@heiso/core/components/ui/table";
import {
  type ColumnDef,
  type ColumnPinningState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@udecode/cn";
import { useCallback, useEffect, useRef, useState } from "react";

const SHADOW_AFTER_BASE =
  "after:content-[''] after:absolute after:top-0 after:h-full after:w-6 after:pointer-events-none after:transition-opacity after:duration-150";

const PINNED_LEFT_SHADOW = `${SHADOW_AFTER_BASE} after:-right-6 after:bg-linear-to-r after:from-black/8 dark:after:from-white/15 after:to-transparent`;
const PINNED_RIGHT_SHADOW = `${SHADOW_AFTER_BASE} after:-left-6 after:bg-linear-to-l after:from-black/8 dark:after:from-white/15 after:to-transparent`;

export interface DataTableProps<TData> {
  className?: string;
  data: TData[];
  columns: ColumnDef<TData, any>[];
  enableStickyColumns?: boolean;
  columnPinning?: ColumnPinningState;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
  globalFilter?: string;
  globalFilterFn?: FilterFn<TData>;
  emptyMessage?: React.ReactNode;
}

function useScrollOverflow() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftShadow(scrollLeft > 1);
    setShowRightShadow(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    update();

    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  return { containerRef, showLeftShadow, showRightShadow };
}

export function DataTable<TData>({
  className,
  data,
  columns,
  enableStickyColumns,
  columnPinning: controlledPinning,
  sorting: controlledSorting,
  onSortingChange,
  manualSorting,
  globalFilter,
  globalFilterFn,
  emptyMessage,
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const sorting = controlledSorting ?? internalSorting;
  const setSorting = onSortingChange ?? setInternalSorting;

  const [defaultPinning] = useState<ColumnPinningState>(
    enableStickyColumns ? { left: ["title"], right: ["actions"] } : {},
  );
  const columnPinning = controlledPinning ?? defaultPinning;

  const { containerRef, showLeftShadow, showRightShadow } = useScrollOverflow();

  const tableRef = useCallback(
    (node: HTMLTableElement | null) => {
      const container = node?.closest<HTMLDivElement>('[data-slot="table-container"]');
      containerRef.current = container ?? null;
    },
    [containerRef],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: globalFilter ?? "",
      columnPinning,
    },
    manualSorting,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(globalFilterFn ? { globalFilterFn } : {}),
  });

  return (
    <Table className={cn("space-y-3 text-muted-foreground", className)} ref={tableRef}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const isSortable = header.column.getCanSort();
              const sorted = header.column.getIsSorted();
              const isPinnedLeft = enableStickyColumns && header.column.getIsPinned() === "left";
              const isPinnedRight = enableStickyColumns && header.column.getIsPinned() === "right";
              return (
                <TableHead
                  key={header.id}
                  isSortable={isSortable}
                  sorted={sorted}
                  handleSort={header.column.getToggleSortingHandler()}
                  className={cn(
                    "select-none",
                    isPinnedLeft && "sticky left-0 z-20 bg-background",
                    isPinnedLeft && PINNED_LEFT_SHADOW,
                    isPinnedLeft && !showLeftShadow && "after:opacity-0",
                    isPinnedRight && "sticky right-0 z-20 bg-background",
                    isPinnedRight && PINNED_RIGHT_SHADOW,
                    isPinnedRight && !showRightShadow && "after:opacity-0",
                  )}
                  style={
                    isPinnedLeft
                      ? { left: header.column.getStart("left") }
                      : isPinnedRight
                        ? { right: header.column.getAfter("right") }
                        : undefined
                  }
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
        {table.getRowModel().rows.length === 0 && emptyMessage ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-center py-8 text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
              {row.getVisibleCells().map((cell) => {
                const isPinnedLeft = enableStickyColumns && cell.column.getIsPinned() === "left";
                const isPinnedRight = enableStickyColumns && cell.column.getIsPinned() === "right";
                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "min-w-24 max-w-56 pr-2.5 last:pr-0",
                      (isPinnedLeft || isPinnedRight) ? "overflow-visible" : "truncate",
                      isPinnedLeft && "sticky left-0 z-10 bg-background",
                      isPinnedLeft && PINNED_LEFT_SHADOW,
                      isPinnedLeft && !showLeftShadow && "after:opacity-0",
                      isPinnedRight && "sticky right-0 z-10 bg-background",
                      isPinnedRight && PINNED_RIGHT_SHADOW,
                      isPinnedRight && !showRightShadow && "after:opacity-0",
                    )}
                    style={
                      isPinnedLeft
                        ? { left: cell.column.getStart("left") }
                        : isPinnedRight
                          ? { right: cell.column.getAfter("right") }
                          : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
