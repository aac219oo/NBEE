"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@heiso/core/components/ui/dropdown-menu";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { LayoutGridIcon, PaintBucketIcon, SquareIcon } from "lucide-react";
import { KEYS, type NodeEntry, type Path, type TLinkElement } from "platejs";
import { useEditorRef, useSelectionFragmentProp } from "platejs/react";
import * as React from "react";
import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import {
  ColorPicker,
  DEFAULT_COLORS,
  DEFAULT_CUSTOM_COLORS,
} from "@heiso/core/components/ui/font-color-toolbar-button";
import { ToolbarButton } from "@heiso/core/components/ui/toolbar";

function useApplyStyle() {
  const editor = useEditorRef();
  const getEntry = React.useCallback(() => {
    const entry = editor.api.node<TLinkElement>({
      match: { type: editor.getType(KEYS.link) },
    });
    return entry as NodeEntry<TLinkElement> | null;
  }, [editor]);

  return React.useCallback(
    (
      updater: (
        style: Record<string, string | number>,
        node: TLinkElement & { style?: Record<string, string | number> },
      ) => Record<string, string | number>,
    ) => {
      const entry = getEntry();
      if (!entry) return;
      const [node, path] = entry as [
        TLinkElement & { style?: Record<string, string | number> },
        Path,
      ];
      const style = (node.style || {}) as Record<string, string | number>;
      const next = updater(style, node);
      editor.tf.setNodes({ style: next }, { at: path });
    },
    [getEntry, editor],
  );
}

function useCurrentStyleValues() {
  const editor = useEditorRef();
  return React.useCallback(() => {
    const entry = editor.api.node<TLinkElement>({
      match: { type: editor.getType(KEYS.link) },
    });
    if (!entry) return null as unknown as Record<string, string> | null;
    const [node] = entry as [
      TLinkElement & { style?: Record<string, string | number> },
      Path,
    ];
    return extractFrameStyles(node as any) as Record<string, string>;
  }, [editor]);
}

function useCurrentButtonProps() {
  const editor = useEditorRef();
  return React.useCallback(() => {
    const entry = editor.api.node<TLinkElement>({
      match: { type: editor.getType(KEYS.link) },
    });
    if (!entry) return null as unknown as TLinkElement | null;
    const [node] = entry as [TLinkElement, Path];
    return node as TLinkElement;
  }, [editor]);
}

const toNumberString = (v: any, fallback: string): string => {
  if (v == null || v === "") return fallback;
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.endsWith("px") ? v.slice(0, -2) : v;
  return fallback;
};

export function ButtonBackgroundToolbarButton(props: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const applyStyle = useApplyStyle();
  const loadCurrent = useCurrentStyleValues();
  const updateColor = (color: string) => {
    applyStyle((style) => ({ ...style, backgroundColor: color }));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Button background">
          <PaintBucketIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[240px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuGroup>
          <ColorPicker
            color={loadCurrent?.()?.backgroundColor as string | undefined}
            clearColor={() =>
              applyStyle((style) => ({
                ...style,
                backgroundColor: undefined as any,
              }))
            }
            colors={DEFAULT_COLORS}
            customColors={DEFAULT_CUSTOM_COLORS}
            updateColor={updateColor}
            updateCustomColor={updateColor}
          />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ButtonBorderToolbarButton(props: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [thickness, setThickness] = React.useState<string>("1");
  const [radius, setRadius] = React.useState<string>("6");
  const applyStyle = useApplyStyle();
  const loadCurrent = useCurrentStyleValues();
  const selBorderTopWidth = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.borderTopWidth,
  });
  const selBorderLeftWidth = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.borderLeftWidth,
  });
  const selBorderBottomWidth = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.borderBottomWidth,
  });
  const selBorderRightWidth = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.borderRightWidth,
  });
  const selBorderRadius = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.borderRadius,
  });
  const updateColor = (color: string) => {
    applyStyle((style) => ({
      ...style,
      borderColor: color,
      borderStyle: style.borderStyle || "solid",
      borderTopWidth: style.borderTopWidth || `${thickness}px`,
      borderRightWidth: style.borderRightWidth || `${thickness}px`,
      borderBottomWidth: style.borderBottomWidth || `${thickness}px`,
      borderLeftWidth: style.borderLeftWidth || `${thickness}px`,
    }));
  };

  const updateThickness = (value: string) => {
    setThickness(value);
    const px = `${parseInt(value || "0", 10)}px`;
    applyStyle((style) => ({
      ...style,
      borderStyle: style.borderStyle || "solid",
      borderTopWidth: px,
      borderRightWidth: px,
      borderBottomWidth: px,
      borderLeftWidth: px,
    }));
  };

  const updateRadius = (value: string) => {
    setRadius(value);
    const px = `${parseInt(value || "0", 10)}px`;
    applyStyle((style) => ({ ...style, borderRadius: px }));
  };

  const resetBorder = () => {
    applyStyle((style) => ({
      ...style,
      borderStyle: undefined as unknown as string,
      borderColor: undefined as unknown as string,
      borderTopWidth: undefined as unknown as string,
      borderRightWidth: undefined as unknown as string,
      borderBottomWidth: undefined as unknown as string,
      borderLeftWidth: undefined as unknown as string,
      borderRadius: undefined as unknown as string,
    }));
    setThickness("0");
    setRadius("6");
  };

  React.useEffect(() => {
    if (!open) return;
    const s = loadCurrent?.();
    if (!s) return;
    setThickness(
      toNumberString(
        selBorderTopWidth ??
        selBorderLeftWidth ??
        selBorderBottomWidth ??
        selBorderRightWidth,
        thickness,
      ),
    );
    setRadius(toNumberString(selBorderRadius, radius));
  }, [
    open,
    selBorderTopWidth,
    selBorderLeftWidth,
    selBorderBottomWidth,
    selBorderRightWidth,
    selBorderRadius,
    loadCurrent,
    thickness,
    radius,
  ]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Button border" isDropdown>
          <SquareIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="w-fit"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="flex gap-6">
              <div className="flex flex-col gap-2">
                <div className="text-sm">Border thickness</div>
                <input
                  type="number"
                  min={0}
                  max={64}
                  step={1}
                  className="h-8 w-full rounded-md border px-2 text-sm"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={thickness}
                  onChange={(e) => updateThickness(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm">Corner radius</div>
                <input
                  type="number"
                  min={0}
                  max={64}
                  step={1}
                  className="h-8 w-full rounded-md border px-2 text-sm"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={radius}
                  onChange={(e) => updateRadius(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 text-sm">Border color</div>
            <ColorPicker
              color={loadCurrent?.()?.borderColor as string | undefined}
              clearColor={() =>
                applyStyle((style) => ({
                  ...style,
                  borderColor: undefined as any,
                }))
              }
              colors={DEFAULT_COLORS}
              customColors={DEFAULT_CUSTOM_COLORS}
              updateColor={updateColor}
              updateCustomColor={updateColor}
            />

            <div className="mt-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={resetBorder}
              >
                Reset border
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ButtonRadiusToolbarButton(props: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [radius, setRadius] = React.useState<string>("6");
  const applyStyle = useApplyStyle();

  const updateRadius = (value: string) => {
    setRadius(value);
    const px = `${parseInt(value || "0", 10)}px`;
    applyStyle((style) => ({ ...style, borderRadius: px }));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Button radius" isDropdown>
          <SquareIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[240px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Corner radius</div>
            <div className="flex items-center gap-2">
              <input
                className="h-8 w-16 rounded-md border px-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                value={radius}
                onChange={(e) => updateRadius(e.target.value)}
              />
              <Button
                className="h-8"
                variant="outline"
                onClick={() => updateRadius("0")}
              >
                none
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ButtonPaddingToolbarButton(props: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [pxPadding, setPxPadding] = React.useState<string>("8");
  const [pyPadding, setPyPadding] = React.useState<string>("12");
  const [width, setWidth] = React.useState<string>("");
  const [height, setHeight] = React.useState<string>("");
  const [textAlign, setTextAlign] = React.useState<
    "left" | "center" | "right" | undefined
  >(undefined);
  const [buttonAlign, setButtonAlign] = React.useState<
    "left" | "center" | "right" | undefined
  >(undefined);
  const [marginTop, setMarginTop] = React.useState<string>("");
  const [marginBottom, setMarginBottom] = React.useState<string>("");
  const [buttonSize, setButtonSize] = React.useState<string>("default");
  const applyStyle = useApplyStyle();
  const loadCurrent = useCurrentStyleValues();
  const loadButton = useCurrentButtonProps();

  const selPaddingLeft = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.paddingLeft,
  });
  const selPaddingRight = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.paddingRight,
  });
  const selPaddingTop = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.paddingTop,
  });
  const selPaddingBottom = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.paddingBottom,
  });
  const selWidth = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.width,
  });
  const selHeight = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.height,
  });
  const selTextAlign = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.textAlign,
  });
  const selJustify = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.justifyContent,
  });
  const selMarginLeft = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.marginLeft,
  });
  const selMarginRight = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.marginRight,
  });
  const selMarginTop = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.marginTop,
  });
  const selMarginBottom = useSelectionFragmentProp({
    defaultValue: undefined,
    getProp: (n) => (n as any)?.style?.marginBottom,
  });
  const selSize = useSelectionFragmentProp({
    defaultValue: "default",
    getProp: (n) => (n as any)?.size,
  });

  const apply = (x: string, y: string) => {
    const px = `${parseInt(x || "0", 10)}px`;
    const py = `${parseInt(y || "0", 10)}px`;
    applyStyle((style) => ({
      ...style,
      paddingLeft: px,
      paddingRight: px,
      paddingTop: py,
      paddingBottom: py,
    }));
  };

  const updateWidth = (val: string) => {
    setWidth(val);
    const px = `${parseInt(val || "0", 10)}px`;
    applyStyle((style) => ({
      ...style,
      width: val ? px : (undefined as unknown as string),
    }));
  };

  const updateHeight = (val: string) => {
    setHeight(val);
    const px = `${parseInt(val || "0", 10)}px`;
    applyStyle((style) => ({
      ...style,
      height: val ? px : (undefined as unknown as string),
    }));
  };

  const updateTextAlignment = (
    align: "left" | "center" | "right" | undefined,
  ) => {
    setTextAlign(align);
    applyStyle((style) => {
      const next = { ...style } as Record<string, string>;
      if (!align) {
        next.textAlign = undefined as unknown as string;
        return next as any;
      }
      next.textAlign = align as unknown as string;
      next.justifyContent = undefined as unknown as string;
      return next as any;
    });
  };

  const updateButtonAlignment = (
    align: "left" | "center" | "right" | undefined,
  ) => {
    setButtonAlign(align);
    applyStyle((style) => {
      const next = { ...style } as Record<string, string>;
      if (!align) {
        next.display = "block";
        next.marginLeft = undefined as unknown as string;
        next.marginRight = undefined as unknown as string;
        return next as any;
      }
      next.display = "block";
      if (align === "center") {
        next.marginLeft = "auto";
        next.marginRight = "auto";
      } else if (align === "left") {
        next.marginLeft = "0";
        next.marginRight = "auto";
      } else {
        next.marginLeft = "auto";
        next.marginRight = "0";
      }
      if (!(style as any).width) {
        next.width = "fit-content" as unknown as string;
      }
      return next as any;
    });
  };

  const updateMarginTop = (val: string) => {
    setMarginTop(val);
    const px = `${parseInt(val || "0", 10)}px`;
    applyStyle((style) => ({
      ...style,
      marginTop: val ? px : (undefined as unknown as string),
    }));
  };

  const updateMarginBottom = (val: string) => {
    setMarginBottom(val);
    const px = `${parseInt(val || "0", 10)}px`;
    applyStyle((style) => ({
      ...style,
      marginBottom: val ? px : (undefined as unknown as string),
    }));
  };

  React.useEffect(() => {
    if (!open) return;
    const s = loadCurrent?.() || ({} as any);
    setPxPadding(
      toNumberString(
        selPaddingLeft ?? s.paddingLeft ?? selPaddingRight ?? s.paddingRight,
        pxPadding,
      ),
    );
    setPyPadding(
      toNumberString(
        selPaddingTop ?? s.paddingTop ?? selPaddingBottom ?? s.paddingBottom,
        pyPadding,
      ),
    );
    setWidth(toNumberString(selWidth ?? s.width, ""));
    setHeight(toNumberString(selHeight ?? s.height, ""));
    const ta = (selTextAlign ?? s.textAlign) as any;
    if (ta === "left" || ta === "center" || ta === "right") {
      setTextAlign(ta);
    } else {
      const jc = (selJustify ?? s.justifyContent) as any;
      setTextAlign(
        jc === "flex-start"
          ? "left"
          : jc === "flex-end"
            ? "right"
            : jc === "center"
              ? "center"
              : undefined,
      );
    }
    const ml = (selMarginLeft ?? s.marginLeft) as any;
    const mr = (selMarginRight ?? s.marginRight) as any;
    if (ml === "auto" && mr === "auto") setButtonAlign("center");
    else if (ml === "0" && mr === "auto") setButtonAlign("left");
    else if (ml === "auto" && mr === "0") setButtonAlign("right");
    else setButtonAlign(undefined);
    setMarginTop(toNumberString(selMarginTop ?? s.marginTop, ""));
    setMarginBottom(toNumberString(selMarginBottom ?? s.marginBottom, ""));
    setButtonSize((selSize ?? (loadButton?.()?.size as any)) || "default");
  }, [
    open,
    selPaddingLeft,
    selPaddingRight,
    selPaddingTop,
    selPaddingBottom,
    selWidth,
    selHeight,
    selTextAlign,
    selJustify,
    selMarginLeft,
    selMarginRight,
    selMarginTop,
    selMarginBottom,
    selSize,
    loadCurrent,
    loadButton,
    pxPadding,
    pyPadding,
  ]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Button padding" isDropdown>
          <LayoutGridIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[260px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Padding</div>
            <div className="flex items-center gap-2">
              <label className="text-sm" htmlFor="btn-padding-x">
                X
              </label>
              <input
                type="number"
                min={0}
                max={64}
                step={1}
                id="btn-padding-x"
                className="h-8 w-16 rounded-md border px-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pxPadding}
                onChange={(e) => {
                  const v = e.target.value;
                  setPxPadding(v);
                  apply(v, pyPadding);
                }}
              />
              <label className="text-sm" htmlFor="btn-padding-y">
                Y
              </label>
              <input
                type="number"
                min={0}
                max={64}
                step={1}
                id="btn-padding-y"
                className="h-8 w-16 rounded-md border px-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pyPadding}
                onChange={(e) => {
                  const v = e.target.value;
                  setPyPadding(v);
                  apply(pxPadding, v);
                }}
              />
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Size</div>
            <div className="flex items-center gap-2">
              <label className="text-sm" htmlFor="btn-width">
                W
              </label>
              <input
                type="number"
                min={0}
                max={1024}
                step={1}
                id="btn-width"
                className="h-8 w-20 rounded-md border px-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                value={width}
                onChange={(e) => updateWidth(e.target.value)}
              />
              <label className="text-sm" htmlFor="btn-height">
                H
              </label>
              <input
                type="number"
                min={0}
                max={1024}
                step={1}
                id="btn-height"
                className="h-8 w-20 rounded-md border px-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                value={height}
                onChange={(e) => updateHeight(e.target.value)}
              />
            </div>
            {width === "" && height === "" && (
              <span className="text-xs text-muted-foreground">
                Button size: {buttonSize}
              </span>
            )}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Spacing</div>
            <div className="flex items-center gap-2">
              <label className="text-sm" htmlFor="btn-mt">
                Top
              </label>
              <input
                type="number"
                min={0}
                max={128}
                step={1}
                id="btn-mt"
                className="h-8 w-20 rounded-md border px-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                value={marginTop}
                onChange={(e) => updateMarginTop(e.target.value)}
              />
              <label className="text-sm" htmlFor="btn-mb">
                Bottom
              </label>
              <input
                type="number"
                min={0}
                max={128}
                step={1}
                id="btn-mb"
                className="h-8 w-20 rounded-md border px-2 text-sm"
                inputMode="numeric"
                pattern="[0-9]*"
                value={marginBottom}
                onChange={(e) => updateMarginBottom(e.target.value)}
              />
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Text alignment</div>
            <div className="flex items-center gap-2">
              <Button
                variant={textAlign === "left" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => updateTextAlignment("left")}
              >
                left
              </Button>
              <Button
                variant={textAlign === "center" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => updateTextAlignment("center")}
              >
                center
              </Button>
              <Button
                variant={textAlign === "right" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => updateTextAlignment("right")}
              >
                right
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Button position</div>
            <div className="flex items-center gap-2">
              <Button
                variant={buttonAlign === "left" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => updateButtonAlignment("left")}
              >
                left
              </Button>
              <Button
                variant={buttonAlign === "center" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => updateButtonAlignment("center")}
              >
                center
              </Button>
              <Button
                variant={buttonAlign === "right" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => updateButtonAlignment("right")}
              >
                right
              </Button>
            </div>{" "}
            <div className="mt-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  applyStyle((style) => ({
                    ...style,
                    paddingLeft: undefined as unknown as string,
                    paddingRight: undefined as unknown as string,
                    paddingTop: undefined as unknown as string,
                    paddingBottom: undefined as unknown as string,
                    width: undefined as unknown as string,
                    height: undefined as unknown as string,
                    textAlign: undefined as unknown as string,
                    justifyContent: undefined as unknown as string,
                    display: "block",
                    marginLeft: undefined as unknown as string,
                    marginRight: undefined as unknown as string,
                    marginTop: undefined as unknown as string,
                    marginBottom: undefined as unknown as string,
                  }));
                  setPxPadding("16");
                  setPyPadding("8");
                  setWidth("");
                  setHeight("");
                  setTextAlign(undefined);
                  setButtonAlign(undefined);
                  setMarginTop("");
                  setMarginBottom("");
                }}
              >
                Reset layout
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
