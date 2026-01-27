"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@heiso/core/components/ui/dropdown-menu";
import { Popover, PopoverContent } from "@heiso/core/components/ui/popover";
import { useDraggable, useDropLine } from "@platejs/dnd";
import {
  BlockSelectionPlugin,
  useBlockSelected,
} from "@platejs/selection/react";
import { setCellBackground } from "@platejs/table";
import {
  TablePlugin,
  TableProvider,
  useTableBordersDropdownMenuContentState,
  useTableCellElement,
  useTableCellElementResizable,
  useTableElement,
  useTableMergeState,
} from "@platejs/table/react";
import type * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { cva } from "class-variance-authority";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CombineIcon,
  Grid2X2Icon,
  GripVertical,
  PaintBucketIcon,
  PaletteIcon,
  Square,
  SquareSplitHorizontalIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import {
  KEYS,
  PathApi,
  type TElement,
  type TTableCellElement,
  type TTableElement,
  type TTableRowElement,
} from "platejs";
import {
  PlateElement,
  type PlateElementProps,
  useComposedRef,
  useEditorPlugin,
  useEditorRef,
  useEditorSelector,
  useElement,
  useElementSelector,
  usePluginOption,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
  withHOC,
} from "platejs/react";
import * as React from "react";
import { cn } from "@heiso/core/lib/utils";

import { blockSelectionVariants } from "./block-selection";
import { ColorPicker, DEFAULT_COLORS } from "./font-color-toolbar-button";
import { ResizeHandle } from "./resize-handle";
import {
  BorderAllIcon,
  BorderBottomIcon,
  BorderLeftIcon,
  BorderNoneIcon,
  BorderRightIcon,
  BorderTopIcon,
} from "./table-icons";
import { Toolbar, ToolbarButton, ToolbarGroup } from "./toolbar";
export const TableElement = withHOC(
  TableProvider,
  function TableElement({
    children,
    ...props
  }: PlateElementProps<TTableElement>) {
    const readOnly = useReadOnly();
    const isSelectionAreaVisible = usePluginOption(
      BlockSelectionPlugin,
      "isSelectionAreaVisible",
    );
    const hasControls = !readOnly && !isSelectionAreaVisible;
    const {
      isSelectingCell,
      marginLeft,
      props: tableProps,
    } = useTableElement();

    const isSelectingTable = useBlockSelected(props.element.id as string);

    const content = (
      <PlateElement
        {...props}
        className={cn(
          "overflow-x-auto py-5",
          hasControls && "-ml-2 *:data-[slot=block-selection]:left-2",
        )}
        style={{ paddingLeft: marginLeft }}
      >
        <div className="group/table relative w-fit">
          <table
            className={cn(
              "mr-0 ml-px table h-px table-fixed border-collapse",
              isSelectingCell && "selection:bg-transparent",
            )}
            {...tableProps}
          >
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

          {isSelectingTable && (
            <div className={blockSelectionVariants()} contentEditable={false} />
          )}
        </div>
      </PlateElement>
    );

    if (readOnly) {
      return content;
    }

    // return <TableFloatingToolbar>{content}</TableFloatingToolbar>;
    return content;
  },
);

function _TableFloatingToolbar({
  children,
  ...props
}: React.ComponentProps<typeof PopoverContent>) {
  const { tf } = useEditorPlugin(TablePlugin);
  const selected = useSelected();
  const element = useElement<TTableElement>();
  const { props: buttonProps } = useRemoveNodeButton({ element });
  const collapsedInside = useEditorSelector(
    (editor) => selected && editor.api.isCollapsed(),
    [selected],
  );

  const { canMerge, canSplit } = useTableMergeState();

  return (
    <Popover open={canMerge || canSplit || collapsedInside} modal={false}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        asChild
        onOpenAutoFocus={(e) => e.preventDefault()}
        contentEditable={false}
        {...props}
      >
        <Toolbar
          className="scrollbar-hide flex w-auto max-w-[80vw] flex-row overflow-x-auto rounded-md border bg-popover p-1 shadow-md print:hidden"
          contentEditable={false}
        >
          <ToolbarGroup>
            <ColorDropdownMenu tooltip="Background color">
              <PaintBucketIcon />
            </ColorDropdownMenu>
            <TableFrameDropdownMenu tooltip="Frame (thickness & sides)">
              <Square />
            </TableFrameDropdownMenu>
            <BorderColorDropdownMenu tooltip="Frame color">
              <PaletteIcon />
            </BorderColorDropdownMenu>
            {canMerge && (
              <ToolbarButton
                onClick={() => tf.table.merge()}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Merge cells"
              >
                <CombineIcon />
              </ToolbarButton>
            )}
            {canSplit && (
              <ToolbarButton
                onClick={() => tf.table.split()}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Split cell"
              >
                <SquareSplitHorizontalIcon />
              </ToolbarButton>
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <ToolbarButton tooltip="Cell borders">
                  <Grid2X2Icon />
                </ToolbarButton>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <TableBordersDropdownMenuContent />
              </DropdownMenuPortal>
            </DropdownMenu>

            {collapsedInside && (
              <ToolbarGroup>
                <ToolbarButton tooltip="Delete table" {...buttonProps}>
                  <Trash2Icon />
                </ToolbarButton>
              </ToolbarGroup>
            )}
          </ToolbarGroup>

          {collapsedInside && (
            <ToolbarGroup>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableRow({ before: true });
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert row before"
              >
                <ArrowUp />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableRow();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert row after"
              >
                <ArrowDown />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.remove.tableRow();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Delete row"
              >
                <XIcon />
              </ToolbarButton>
            </ToolbarGroup>
          )}

          {collapsedInside && (
            <ToolbarGroup>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableColumn({ before: true });
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert column before"
              >
                <ArrowLeft />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableColumn();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert column after"
              >
                <ArrowRight />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.remove.tableColumn();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Delete column"
              >
                <XIcon />
              </ToolbarButton>
            </ToolbarGroup>
          )}
        </Toolbar>
      </PopoverContent>
    </Popover>
  );
}

function TableBordersDropdownMenuContent(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Content>,
) {
  const editor = useEditorRef();
  const _selectedCells = usePluginOption(TablePlugin, "selectedCells");
  const tableElement = useElement<TTableElement>();
  const _tablePath = editor.api.path(tableElement);
  const [_thickness, _setThickness] = React.useState<number>(0);
  const [_tableSides, _setTableSides] = React.useState({
    top: true,
    right: true,
    bottom: true,
    left: true,
  });
  const {
    getOnSelectTableBorder,
    hasBottomBorder,
    hasLeftBorder,
    hasNoBorders,
    hasOuterBorders,
    hasRightBorder,
    hasTopBorder,
  } = useTableBordersDropdownMenuContentState();

  return (
    <DropdownMenuContent
      className="min-w-[220px]"
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        editor.tf.focus();
      }}
      align="start"
      side="right"
      sideOffset={0}
      {...props}
    >
      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          checked={hasTopBorder}
          onCheckedChange={getOnSelectTableBorder("top")}
        >
          <BorderTopIcon />
          <div>Top Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasRightBorder}
          onCheckedChange={getOnSelectTableBorder("right")}
        >
          <BorderRightIcon />
          <div>Right Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasBottomBorder}
          onCheckedChange={getOnSelectTableBorder("bottom")}
        >
          <BorderBottomIcon />
          <div>Bottom Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasLeftBorder}
          onCheckedChange={getOnSelectTableBorder("left")}
        >
          <BorderLeftIcon />
          <div>Left Border</div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>

      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          checked={hasNoBorders}
          onCheckedChange={getOnSelectTableBorder("none")}
        >
          <BorderNoneIcon />
          <div>No Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasOuterBorders}
          onCheckedChange={getOnSelectTableBorder("outer")}
        >
          <BorderAllIcon />
          <div>Outside Borders</div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );
}

function ColorDropdownMenu({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  const [open, setOpen] = React.useState(false);

  const editor = useEditorRef();
  const selectedCells = usePluginOption(TablePlugin, "selectedCells");

  const [_selectedColor, setSelectedColor] = React.useState<
    string | undefined
  >();
  const [_customColor, setCustomColor] = React.useState<string | undefined>();
  const [_colorInputValue, setColorInputValue] =
    React.useState<string>("#000000");

  const DEFAULT_CUSTOM_COLORS = React.useMemo(
    () => [
      { isBrightColor: false, name: "dark orange 3", value: "#783F04" },
      { isBrightColor: false, name: "dark grey 3", value: "#666666" },
      { isBrightColor: false, name: "dark grey 2", value: "#999999" },
      {
        isBrightColor: false,
        name: "light cornflower blue 1",
        value: "#6C9EEB",
      },
      { isBrightColor: false, name: "dark magenta 3", value: "#4C1130" },
    ],
    [],
  );

  const onUpdateColor = React.useCallback(
    (color: string) => {
      setOpen(false);
      setSelectedColor(color);
      setCellBackground(editor, { color, selectedCells: selectedCells ?? [] });
    },
    [selectedCells, editor],
  );

  const onClearColor = React.useCallback(() => {
    setOpen(false);
    setCellBackground(editor, {
      color: null,
      selectedCells: selectedCells ?? [],
    });
  }, [selectedCells, editor]);

  React.useEffect(() => {
    if (!open) return;
    const first = selectedCells?.[0] as any;
    const current = first?.[0]?.background as string | undefined;
    if (current) {
      setSelectedColor(current);
      setColorInputValue(current);
      const all = [
        ...DEFAULT_COLORS.map((c) => c.value),
        ...DEFAULT_CUSTOM_COLORS.map((c) => c.value),
      ];
      if (!all.includes(current)) {
        setCustomColor(current);
      } else {
        setCustomColor(undefined);
      }
    } else {
      setSelectedColor(undefined);
      setCustomColor(undefined);
      setColorInputValue("#000000");
    }
  }, [open, selectedCells, DEFAULT_CUSTOM_COLORS]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip={tooltip}>{children}</ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <ColorPicker
          color={
            (selectedCells?.[0] as any)?.[0]?.background as string | undefined
          }
          clearColor={onClearColor}
          colors={DEFAULT_COLORS}
          customColors={DEFAULT_CUSTOM_COLORS}
          updateColor={onUpdateColor}
          updateCustomColor={(c) => {
            setCellBackground(editor, {
              color: c,
              selectedCells: selectedCells ?? [],
            });
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BorderColorDropdownMenu({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  const [open, setOpen] = React.useState(false);
  const editor = useEditorRef();
  const _selectedCells = usePluginOption(TablePlugin, "selectedCells");
  const tableElement = useElement<TTableElement>();
  const tablePath = editor.api.path(tableElement);

  const [_selectedBorderColor, setSelectedBorderColor] = React.useState<
    string | undefined
  >();
  const [_borderCustomColor, setBorderCustomColor] = React.useState<
    string | undefined
  >();
  const [_borderColorInputValue, setBorderColorInputValue] =
    React.useState<string>("#000000");

  const DEFAULT_CUSTOM_COLORS = React.useMemo(
    () => [
      { isBrightColor: false, name: "dark orange 3", value: "#783F04" },
      { isBrightColor: false, name: "dark grey 3", value: "#666666" },
      { isBrightColor: false, name: "dark grey 2", value: "#999999" },
      {
        isBrightColor: false,
        name: "light cornflower blue 1",
        value: "#6C9EEB",
      },
      { isBrightColor: false, name: "dark magenta 3", value: "#4C1130" },
    ],
    [],
  );

  const onUpdateColor = React.useCallback(
    (color: string) => {
      setOpen(false);
      setSelectedBorderColor(color);
      if (tablePath) {
        const currentStyle = ((tableElement as any).style || {}) as Record<
          string,
          string
        >;
        const nextStyle = {
          ...currentStyle,
          "--tableBorderColor": color,
        } as Record<string, string>;
        editor.tf.setNodes({ style: nextStyle as any }, { at: tablePath });
      }
    },
    [editor, tableElement, tablePath],
  );

  const onClearColor = React.useCallback(() => {
    setOpen(false);
    if (tablePath) {
      const currentStyle = ((tableElement as any).style || {}) as Record<
        string,
        string
      >;
      const nextStyle = { ...currentStyle } as Record<string, string>;
      delete nextStyle["--tableBorderColor"];
      editor.tf.setNodes({ style: nextStyle as any }, { at: tablePath });
    }
  }, [editor, tableElement, tablePath]);

  React.useEffect(() => {
    if (!open) return;
    const current = (tableElement as any).style?.["--tableBorderColor"] as
      | string
      | undefined;
    if (current) {
      setSelectedBorderColor(current);
      setBorderColorInputValue(current);
      const all = [
        ...DEFAULT_COLORS.map((c) => c.value),
        ...DEFAULT_CUSTOM_COLORS.map((c) => c.value),
      ];
      if (!all.includes(current)) {
        setBorderCustomColor(current);
      } else {
        setBorderCustomColor(undefined);
      }
    } else {
      setSelectedBorderColor(undefined);
      setBorderCustomColor(undefined);
      setBorderColorInputValue("#000000");
    }
  }, [open, tableElement, DEFAULT_CUSTOM_COLORS]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip={tooltip}>{children}</ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <ColorPicker
          color={
            (tableElement as any).style?.["--tableBorderColor"] as
            | string
            | undefined
          }
          clearColor={onClearColor}
          colors={DEFAULT_COLORS}
          customColors={DEFAULT_CUSTOM_COLORS}
          updateColor={onUpdateColor}
          updateCustomColor={(c) => {
            if (tablePath) {
              const currentStyle = ((tableElement as any).style ||
                {}) as Record<string, string>;
              const nextStyle = {
                ...currentStyle,
                "--tableBorderColor": c,
              } as Record<string, string>;
              editor.tf.setNodes(
                { style: nextStyle as any },
                { at: tablePath },
              );
            }
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableFrameDropdownMenu({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  const [open, setOpen] = React.useState(false);
  const editor = useEditorRef();
  const tableElement = useElement<TTableElement>();
  const tablePath = editor.api.path(tableElement);
  const [thickness, setThickness] = React.useState<number>(0);
  const [sides, setSides] = React.useState({
    top: true,
    right: true,
    bottom: true,
    left: true,
  });
  const [styleType, setStyleType] = React.useState<
    "solid" | "dotted" | "dashed" | "double"
  >("solid");

  const mergeSet = React.useCallback(
    (patch: Record<string, string>) => {
      if (!tablePath) return;
      const current = ((tableElement as any).style || {}) as Record<
        string,
        string
      >;
      const next = { ...current, ...patch } as Record<string, string>;
      editor.tf.setNodes({ style: next }, { at: tablePath });
    },
    [editor, tableElement, tablePath],
  );

  React.useEffect(() => {
    if (!open) return;
    const s = ((tableElement as any).style || {}) as Record<string, string>;
    const toPx = (v: any) =>
      typeof v === "string" ? parseInt(v, 10) || 0 : v || 0;
    const tw = toPx(s["--tableBorderTopWidth"]);
    const rw = toPx(s["--tableBorderRightWidth"]);
    const bw = toPx(s["--tableBorderBottomWidth"]);
    const lw = toPx(s["--tableBorderLeftWidth"]);
    const t = Math.max(tw, rw, bw, lw);
    setThickness(t || 0);
    setSides({ top: tw > 0, right: rw > 0, bottom: bw > 0, left: lw > 0 });
    setStyleType((s["--tableBorderStyle"] as any) || "solid");
  }, [open, tableElement]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip={tooltip}>{children}</ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Thickness (px)</div>
            <input
              type="number"
              min={0}
              max={16}
              step={1}
              value={thickness}
              onChange={(e) => {
                const t = Number(e.target.value) || 0;
                setThickness(t);
                mergeSet({
                  "--tableBorderTopWidth": sides.top ? `${t}px` : "0px",
                  "--tableBorderRightWidth": sides.right ? `${t}px` : "0px",
                  "--tableBorderBottomWidth": sides.bottom ? `${t}px` : "0px",
                  "--tableBorderLeftWidth": sides.left ? `${t}px` : "0px",
                });
              }}
              className="h-8 w-24 rounded-sm border px-2 text-sm"
            />
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Sides</div>
            <div className="grid grid-cols-2 gap-2">
              <DropdownMenuCheckboxItem
                checked={sides.top}
                onCheckedChange={(checked) => {
                  const next = { ...sides, top: !!checked };
                  setSides(next);
                  mergeSet({
                    "--tableBorderTopWidth": next.top
                      ? `${thickness}px`
                      : "0px",
                  });
                }}
              >
                <BorderTopIcon />
                <div>Top</div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sides.right}
                onCheckedChange={(checked) => {
                  const next = { ...sides, right: !!checked };
                  setSides(next);
                  mergeSet({
                    "--tableBorderRightWidth": next.right
                      ? `${thickness}px`
                      : "0px",
                  });
                }}
              >
                <BorderRightIcon />
                <div>Right</div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sides.bottom}
                onCheckedChange={(checked) => {
                  const next = { ...sides, bottom: !!checked };
                  setSides(next);
                  mergeSet({
                    "--tableBorderBottomWidth": next.bottom
                      ? `${thickness}px`
                      : "0px",
                  });
                }}
              >
                <BorderBottomIcon />
                <div>Bottom</div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sides.left}
                onCheckedChange={(checked) => {
                  const next = { ...sides, left: !!checked };
                  setSides(next);
                  mergeSet({
                    "--tableBorderLeftWidth": next.left
                      ? `${thickness}px`
                      : "0px",
                  });
                }}
              >
                <BorderLeftIcon />
                <div>Left</div>
              </DropdownMenuCheckboxItem>
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Style</div>
            <div className="flex gap-2">
              <Button
                variant={styleType === "solid" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setStyleType("solid");
                  mergeSet({ "--tableBorderStyle": "solid" });
                }}
              >
                solid
              </Button>
              <Button
                variant={styleType === "dashed" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setStyleType("dashed");
                  mergeSet({ "--tableBorderStyle": "dashed" });
                }}
              >
                dashed
              </Button>
              <Button
                variant={styleType === "dotted" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setStyleType("dotted");
                  mergeSet({ "--tableBorderStyle": "dotted" });
                }}
              >
                dotted
              </Button>
              <Button
                variant={styleType === "double" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setStyleType("double");
                  mergeSet({ "--tableBorderStyle": "double" });
                }}
              >
                double
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TableRowElement(props: PlateElementProps<TTableRowElement>) {
  const { element } = props;
  const readOnly = useReadOnly();
  const selected = useSelected();
  const editor = useEditorRef();
  const isSelectionAreaVisible = usePluginOption(
    BlockSelectionPlugin,
    "isSelectionAreaVisible",
  );
  const hasControls = !readOnly && !isSelectionAreaVisible;

  const { isDragging, previewRef, handleRef } = useDraggable({
    element,
    type: element.type,
    canDropNode: ({ dragEntry, dropEntry }) =>
      PathApi.equals(
        PathApi.parent(dragEntry[1]),
        PathApi.parent(dropEntry[1]),
      ),
    onDropHandler: (_, { dragItem }) => {
      const dragElement = (dragItem as { element: TElement }).element;

      if (dragElement) {
        editor.tf.select(dragElement);
      }
    },
  });

  return (
    <PlateElement
      {...props}
      ref={useComposedRef(props.ref, previewRef)}
      as="tr"
      className={cn("group/row", isDragging && "opacity-50")}
      attributes={{
        ...props.attributes,
        "data-selected": selected ? "true" : undefined,
      }}
    >
      {hasControls && (
        <td className="w-2 select-none" contentEditable={false}>
          <RowDragHandle dragRef={handleRef} />
          <RowDropLine />
        </td>
      )}

      {props.children}
    </PlateElement>
  );
}

function RowDragHandle({ dragRef }: { dragRef: React.Ref<any> }) {
  const editor = useEditorRef();
  const element = useElement();

  return (
    <Button
      ref={dragRef}
      variant="outline"
      className={cn(
        "absolute top-1/2 left-0 z-51 h-6 w-4 -translate-y-1/2 p-0 focus-visible:ring-0 focus-visible:ring-offset-0",
        "cursor-grab active:cursor-grabbing",
        'opacity-0 transition-opacity duration-100 group-hover/row:opacity-100 group-has-data-[resizing="true"]/row:opacity-0',
      )}
      onClick={() => {
        editor.tf.select(element);
      }}
    >
      <GripVertical className="text-muted-foreground" />
    </Button>
  );
}

function RowDropLine() {
  const { dropLine } = useDropLine();

  if (!dropLine) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 left-2 z-50 h-0.5 bg-brand/50",
        dropLine === "top" ? "-top-px" : "-bottom-px",
      )}
    />
  );
}

export function TableCellElement({
  isHeader,
  ...props
}: PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { api } = useEditorPlugin(TablePlugin);
  const readOnly = useReadOnly();
  const element = props.element;
  const elementStyle = (element as any).style as
    | Record<string, string>
    | undefined;
  const cellBorderInline: React.CSSProperties = {
    borderTopWidth: (elementStyle?.["--cellBorderTopWidth"] as any) || 0,
    borderRightWidth: (elementStyle?.["--cellBorderRightWidth"] as any) || 0,
    borderBottomWidth: (elementStyle?.["--cellBorderBottomWidth"] as any) || 0,
    borderLeftWidth: (elementStyle?.["--cellBorderLeftWidth"] as any) || 0,
    borderColor: (elementStyle?.["--cellBorderColor"] as any) || undefined,
    borderStyle: (elementStyle?.["--cellBorderStyle"] as any) || "solid",
  };

  const rowId = useElementSelector(([node]) => node.id as string, [], {
    key: KEYS.tr,
  });
  const isSelectingRow = useBlockSelected(rowId);
  const isSelectionAreaVisible = usePluginOption(
    BlockSelectionPlugin,
    "isSelectionAreaVisible",
  );

  const { borders, colIndex, colSpan, minHeight, rowIndex, selected, width } =
    useTableCellElement();

  const { bottomProps, hiddenLeft, leftProps, rightProps } =
    useTableCellElementResizable({
      colIndex,
      colSpan,
      rowIndex,
    });

  return (
    <PlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      className={cn(
        "h-full overflow-visible border-none bg-background p-0",
        element.background ? "bg-(--cellBackground)" : "bg-background",
        isHeader && "text-left *:m-0",
        "before:size-full",
        selected && "before:z-10 before:bg-brand/5",
        "before:absolute before:box-border before:content-[''] before:select-none",
        "before:border-solid before:border-(--cellBorderColor) before:border-[style:var(--cellBorderStyle)]",
        borders.bottom?.size &&
        `before:border-b before:border-b-border before:border-b-[var(--cellBorderBottomWidth)]`,
        borders.right?.size &&
        `before:border-r before:border-r-border before:border-r-[var(--cellBorderRightWidth)]`,
        borders.left?.size &&
        `before:border-l before:border-l-border before:border-l-[var(--cellBorderLeftWidth)]`,
        borders.top?.size &&
        `before:border-t before:border-t-border before:border-t-[var(--cellBorderTopWidth)]`,
      )}
      style={
        {
          ...(element as any).style,
          "--cellBackground": element.background,
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
        className="relative z-20 box-border h-full px-3 py-2"
        style={{ minHeight }}
      >
        {props.children}
      </div>
      <div
        className="absolute inset-0 z-10 box-border pointer-events-none"
        style={cellBorderInline}
      />

      {!isSelectionAreaVisible && (
        <div
          className="group absolute top-0 size-full select-none"
          contentEditable={false}
          suppressContentEditableWarning={true}
        >
          {!readOnly && (
            <>
              <ResizeHandle
                {...rightProps}
                className="-top-2 -right-1 h-[calc(100%_+_8px)] w-2"
                data-col={colIndex}
              />
              <ResizeHandle {...bottomProps} className="-bottom-1 h-2" />
              {!hiddenLeft && (
                <ResizeHandle
                  {...leftProps}
                  className="top-0 -left-1 w-2"
                  data-resizer-left={colIndex === 0 ? "true" : undefined}
                />
              )}

              <div
                className={cn(
                  "absolute top-0 z-30 hidden h-full w-1 bg-ring",
                  "right-[-1.5px]",
                  columnResizeVariants({ colIndex: colIndex as any }),
                )}
              />
              {colIndex === 0 && (
                <div
                  className={cn(
                    "absolute top-0 z-30 h-full w-1 bg-ring",
                    "left-[-1.5px]",
                    'hidden animate-in fade-in group-has-[[data-resizer-left]:hover]/table:block group-has-[[data-resizer-left][data-resizing="true"]]/table:block',
                  )}
                />
              )}
            </>
          )}
        </div>
      )}

      {isSelectingRow && (
        <div className={blockSelectionVariants()} contentEditable={false} />
      )}
    </PlateElement>
  );
}

export function TableCellHeaderElement(
  props: React.ComponentProps<typeof TableCellElement>,
) {
  return <TableCellElement {...props} isHeader />;
}

const columnResizeVariants = cva("hidden animate-in fade-in", {
  variants: {
    colIndex: {
      0: 'group-has-[[data-col="0"]:hover]/table:block group-has-[[data-col="0"][data-resizing="true"]]/table:block',
      1: 'group-has-[[data-col="1"]:hover]/table:block group-has-[[data-col="1"][data-resizing="true"]]/table:block',
      2: 'group-has-[[data-col="2"]:hover]/table:block group-has-[[data-col="2"][data-resizing="true"]]/table:block',
      3: 'group-has-[[data-col="3"]:hover]/table:block group-has-[[data-col="3"][data-resizing="true"]]/table:block',
      4: 'group-has-[[data-col="4"]:hover]/table:block group-has-[[data-col="4"][data-resizing="true"]]/table:block',
      5: 'group-has-[[data-col="5"]:hover]/table:block group-has-[[data-col="5"][data-resizing="true"]]/table:block',
      6: 'group-has-[[data-col="6"]:hover]/table:block group-has-[[data-col="6"][data-resizing="true"]]/table:block',
      7: 'group-has-[[data-col="7"]:hover]/table:block group-has-[[data-col="7"][data-resizing="true"]]/table:block',
      8: 'group-has-[[data-col="8"]:hover]/table:block group-has-[[data-col="8"][data-resizing="true"]]/table:block',
      9: 'group-has-[[data-col="9"]:hover]/table:block group-has-[[data-col="9"][data-resizing="true"]]/table:block',
      10: 'group-has-[[data-col="10"]:hover]/table:block group-has-[[data-col="10"][data-resizing="true"]]/table:block',
    },
  },
});
