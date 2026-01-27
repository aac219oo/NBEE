import { BaseTablePlugin } from "@platejs/table";

import type {
  SlateElementProps,
  TTableCellElement,
  TTableElement,
} from "platejs";
import { SlateElement } from "platejs";
import type * as React from "react";

import { cn } from "@heiso/core/lib/utils";

export function TableElementStatic({
  children,
  ...props
}: SlateElementProps<TTableElement>) {
  const { disableMarginLeft } = props.editor.getOptions(BaseTablePlugin);
  const marginLeft = disableMarginLeft ? 0 : props.element.marginLeft;

  return (
    <SlateElement
      {...props}
      className="overflow-x-auto py-5"
      style={{ paddingLeft: marginLeft }}
    >
      <div className="group/table relative w-fit">
        <table className="mr-0 ml-px table h-px table-fixed border-collapse">
          <tbody className="min-w-full">{children}</tbody>
        </table>
        <div
          className="pointer-events-none absolute inset-0 z-20 box-border"
          style={{
            borderColor:
              ((props.element as any).style?.[
                "--tableBorderColor"
              ] as string) || "var(--border)",
            borderStyle:
              ((props.element as any).style?.[
                "--tableBorderStyle"
              ] as string) || "solid",
            borderTopWidth:
              ((props.element as any).style?.[
                "--tableBorderTopWidth"
              ] as string) ??
              ((props.element as any).style?.[
                "--tableBorderWidth"
              ] as string) ??
              0,
            borderRightWidth:
              ((props.element as any).style?.[
                "--tableBorderRightWidth"
              ] as string) ??
              ((props.element as any).style?.[
                "--tableBorderWidth"
              ] as string) ??
              0,
            borderBottomWidth:
              ((props.element as any).style?.[
                "--tableBorderBottomWidth"
              ] as string) ??
              ((props.element as any).style?.[
                "--tableBorderWidth"
              ] as string) ??
              0,
            borderLeftWidth:
              ((props.element as any).style?.[
                "--tableBorderLeftWidth"
              ] as string) ??
              ((props.element as any).style?.[
                "--tableBorderWidth"
              ] as string) ??
              0,
            left: "8px",
          }}
        />
      </div>
    </SlateElement>
  );
}

export function TableRowElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} as="tr" className="h-full">
      {props.children}
    </SlateElement>
  );
}

export function TableCellElementStatic({
  isHeader,
  ...props
}: SlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { editor, element } = props;
  const { api } = editor.getPlugin(BaseTablePlugin);

  const { minHeight, width } = api.table.getCellSize({ element });
  const borders = api.table.getCellBorders({ element });

  return (
    <SlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      className={cn(
        "h-full overflow-visible border-none bg-background p-0",
        element.background ? "bg-(--cellBackground)" : "bg-background",
        isHeader && "text-left font-normal *:m-0",
        "before:size-full",
        "before:absolute before:box-border before:content-[''] before:select-none",
        "before:border-solid before:border-(--cellBorderColor) before:border-[style:var(--cellBorderStyle)]",
        borders &&
        cn(
          borders.bottom?.size &&
          `before:border-b before:border-b-border before:border-b-[var(--cellBorderBottomWidth)]`,
          borders.right?.size &&
          `before:border-r before:border-r-border before:border-r-[var(--cellBorderRightWidth)]`,
          borders.left?.size &&
          `before:border-l before:border-l-border before:border-l-[var(--cellBorderLeftWidth)]`,
          borders.top?.size &&
          `before:border-t before:border-t-border before:border-t-[var(--cellBorderTopWidth)]`,
        ),
      )}
      style={
        {
          ...(element as any).style,
          "--cellBackground": element.background,
          "--cellBorderColor": (element as any).style?.["--cellBorderColor"],
          maxWidth: width || 240,
          minWidth: width || 120,
        } as React.CSSProperties
      }
      attributes={{
        ...props.attributes,
        colSpan: api.table.getColSpan(element),
        rowSpan: api.table.getRowSpan(element),
      }}
    >
      <div
        className="relative z-20 box-border h-full px-4 py-2"
        style={{ minHeight }}
      >
        {props.children}
      </div>
      <div
        className="absolute inset-0 z-10 box-border pointer-events-none"
        style={{
          borderTopWidth:
            ((element as any).style?.["--cellBorderTopWidth"] as any) || 0,
          borderRightWidth:
            ((element as any).style?.["--cellBorderRightWidth"] as any) || 0,
          borderBottomWidth:
            ((element as any).style?.["--cellBorderBottomWidth"] as any) || 0,
          borderLeftWidth:
            ((element as any).style?.["--cellBorderLeftWidth"] as any) || 0,
          borderColor:
            ((element as any).style?.["--cellBorderColor"] as any) || undefined,
          borderStyle:
            ((element as any).style?.["--cellBorderStyle"] as any) || "solid",
        }}
      />
    </SlateElement>
  );
}

export function TableCellHeaderElementStatic(
  props: SlateElementProps<TTableCellElement>,
) {
  return <TableCellElementStatic {...props} isHeader />;
}
