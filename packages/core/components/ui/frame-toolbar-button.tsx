"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@heiso/core/components/ui/dropdown-menu";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import {
  LayoutGridIcon,
  PaintBucketIcon,
  PaletteIcon,
  SquareIcon,
} from "lucide-react";
import { KEYS } from "platejs";
import { useEditorRef } from "platejs/react";
import * as React from "react";
import { useState } from "react";
import {
  ColorDropdownMenuItems,
  DEFAULT_COLORS,
} from "./font-color-toolbar-button";
import {
  BorderAllIcon,
  BorderBottomIcon,
  BorderLeftIcon,
  BorderNoneIcon,
  BorderRightIcon,
  BorderTopIcon,
} from "./table-icons";
import { ToolbarButton } from "./toolbar";

export function FrameBorderToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = useState(false);
  const [thickness, setThickness] = useState<number>(1);
  const [sides, setSides] = useState({
    top: false,
    right: false,
    bottom: false,
    left: false,
  });
  const [styleType, setStyleType] = useState<
    "solid" | "dotted" | "dashed" | "double"
  >("solid");
  const [_hasTarget, setHasTarget] = useState<boolean>(false);
  const [_radius, setRadius] = useState<number>(0);
  const [_mode, setMode] = useState<"block" | "content">("block");
  const [thicknessInput, setThicknessInput] = useState<string>("0");
  const [radiusInput, setRadiusInput] = useState<string>("0");
  const [_padding, setPadding] = useState<number>(0);
  const [_paddingInput, setPaddingInput] = useState<string>("0");

  const getCurrentEntry = React.useCallback(() => {
    const entries = editor.api.blocks({ mode: "lowest" });
    return entries.length ? entries[0] : null;
  }, [editor]);

  const applyToCurrent = React.useCallback(
    (
      updater: (current: Record<string, any>, node: any) => Record<string, any>,
    ) => {
      const entry = getCurrentEntry();
      if (!entry) return;
      const [node, path] = entry as [any, any];
      const current = ((node as any).style || {}) as Record<string, any>;
      const next = updater(current, node);
      editor.tf.setNodes({ style: next }, { at: path });
    },
    [editor, getCurrentEntry],
  );

  const onThicknessChange = (
    t: number,
    sidesOverride?: {
      top: boolean;
      right: boolean;
      bottom: boolean;
      left: boolean;
    },
  ) => {
    setThickness(t);
    applyToCurrent((current, node) => {
      const isTable = (node as any).type === KEYS.table;
      const s = sidesOverride ?? sides;
      if (isTable) {
        return {
          ...current,
          "--tableBorderTopWidth": s.top ? `${t}px` : "0px",
          "--tableBorderRightWidth": s.right ? `${t}px` : "0px",
          "--tableBorderBottomWidth": s.bottom ? `${t}px` : "0px",
          "--tableBorderLeftWidth": s.left ? `${t}px` : "0px",
          "--tableBorderStyle": styleType,
          "--tableBorderColor":
            current["--tableBorderColor"] ?? "var(--border)",
        };
      }
      return {
        ...current,
        borderTopWidth: s.top ? `${t}px` : "0px",
        borderRightWidth: s.right ? `${t}px` : "0px",
        borderBottomWidth: s.bottom ? `${t}px` : "0px",
        borderLeftWidth: s.left ? `${t}px` : "0px",
        borderStyle: styleType,
        borderColor: current.borderColor ?? "var(--border)",
      };
    });
  };

  React.useEffect(() => {
    if (!open) return;
    const entry = getCurrentEntry();
    if (!entry) {
      setHasTarget(false);
      return;
    }
    const [node] = entry as [any, any];
    const current = ((node as any).style || {}) as Record<string, any>;
    const isTable = (node as any).type === KEYS.table;
    setHasTarget(true);

    if (isTable) {
      const tw = current["--tableBorderTopWidth"];
      const rw = current["--tableBorderRightWidth"];
      const bw = current["--tableBorderBottomWidth"];
      const lw = current["--tableBorderLeftWidth"];
      const st = current["--tableBorderStyle"];
      const toPx = (v: any) =>
        typeof v === "string" ? parseInt(v, 10) || 0 : v || 0;
      const t = Math.max(toPx(tw), toPx(rw), toPx(bw), toPx(lw));
      setThickness(t || 1);
      setThicknessInput(String(t || 1));
      setSides({
        top: toPx(tw) > 0,
        right: toPx(rw) > 0,
        bottom: toPx(bw) > 0,
        left: toPx(lw) > 0,
      });
      setStyleType((st as any) || "solid");
    } else {
      const bt = current.borderTopWidth as any;
      const br = current.borderRightWidth as any;
      const bb = current.borderBottomWidth as any;
      const bl = current.borderLeftWidth as any;
      const st = current.borderStyle as any;
      const toNum = (v: any) =>
        typeof v === "string" ? parseInt(v, 10) || 0 : v || 0;
      const nbt = toNum(bt);
      const nbr = toNum(br);
      const nbb = toNum(bb);
      const nbl = toNum(bl);
      const t = Math.max(nbt, nbr, nbb, nbl);
      setThickness(t || 1);
      setThicknessInput(String(t || 1));
      const allZero = nbt === 0 && nbr === 0 && nbb === 0 && nbl === 0;
      setSides(
        allZero
          ? { top: false, right: false, bottom: false, left: false }
          : { top: nbt > 0, right: nbr > 0, bottom: nbb > 0, left: nbl > 0 },
      );
      setStyleType(st || "solid");
      const r = current.borderRadius as any;
      const d = current.display as any;
      const toNumR = (v: any) =>
        typeof v === "string" ? parseInt(v, 10) || 0 : v || 0;
      setRadius(toNumR(r) || 0);
      setRadiusInput(String(toNumR(r) || 0));
      setMode(d === "inline-block" ? "content" : "block");
      const toNumP = (v: any) =>
        typeof v === "string" ? parseInt(v, 10) || 0 : v || 0;
      const p = toNumP((current as any).padding);
      setPadding(p || 0);
      setPaddingInput(String(p || 0));
    }
  }, [open, getCurrentEntry]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          pressed={open}
          tooltip="Frame (thickness & sides)"
          isDropdown
        >
          <SquareIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[240px]"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Sides</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={
                  !sides.top && !sides.right && !sides.bottom && !sides.left
                    ? "default"
                    : "outline"
                }
                className="h-8 px-3"
                onClick={() => {
                  const next = {
                    top: false,
                    right: false,
                    bottom: false,
                    left: false,
                  };
                  setSides(next);
                  onThicknessChange(thickness, next);
                }}
              >
                <BorderNoneIcon />
                <div>none</div>
              </Button>
              <Button
                variant={
                  sides.top && sides.right && sides.bottom && sides.left
                    ? "default"
                    : "outline"
                }
                className="h-8 px-3"
                onClick={() => {
                  const next = {
                    top: true,
                    right: true,
                    bottom: true,
                    left: true,
                  };
                  setSides(next);
                  onThicknessChange(thickness, next);
                }}
              >
                <BorderAllIcon />
                <div>all</div>
              </Button>
              <Button
                variant={
                  sides.top && !sides.right && !sides.bottom && !sides.left
                    ? "default"
                    : "outline"
                }
                className="h-8 px-3"
                onClick={() => {
                  const next = {
                    top: true,
                    right: false,
                    bottom: false,
                    left: false,
                  };
                  setSides(next);
                  onThicknessChange(thickness, next);
                }}
              >
                <BorderTopIcon />
                <div>top</div>
              </Button>
              <Button
                variant={
                  !sides.top && !sides.right && !sides.bottom && sides.left
                    ? "default"
                    : "outline"
                }
                className="h-8 px-3"
                onClick={() => {
                  const next = {
                    top: false,
                    right: false,
                    bottom: false,
                    left: true,
                  };
                  setSides(next);
                  onThicknessChange(thickness, next);
                }}
              >
                <BorderLeftIcon />
                <div>left</div>
              </Button>
              <Button
                variant={
                  !sides.top && !sides.right && sides.bottom && !sides.left
                    ? "default"
                    : "outline"
                }
                className="h-8 px-3"
                onClick={() => {
                  const next = {
                    top: false,
                    right: false,
                    bottom: true,
                    left: false,
                  };
                  setSides(next);
                  onThicknessChange(thickness, next);
                }}
              >
                <BorderBottomIcon />
                <div>bottom</div>
              </Button>
              <Button
                variant={
                  !sides.top && sides.right && !sides.bottom && !sides.left
                    ? "default"
                    : "outline"
                }
                className="h-8 px-3"
                onClick={() => {
                  const next = {
                    top: false,
                    right: true,
                    bottom: false,
                    left: false,
                  };
                  setSides(next);
                  onThicknessChange(thickness, next);
                }}
              >
                <BorderRightIcon />
                <div>right</div>
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <div>
              <div className="mb-2 text-sm">Radius (px)</div>
              <input
                type="number"
                min={0}
                max={48}
                step={1}
                value={radiusInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setRadiusInput(val);
                  const r = parseInt(val, 10);
                  if (!Number.isNaN(r) && r >= 0) {
                    setRadius(r);
                    applyToCurrent((current, node) => {
                      const isTable = (node as any).type === KEYS.table;
                      if (isTable) return current;
                      return { ...current, borderRadius: `${r}px` } as Record<
                        string,
                        any
                      >;
                    });
                  }
                }}
                className="h-8 w-full rounded-sm border px-2 text-sm"
              />
            </div>
            <div>
              <div className="mb-2 text-sm">Thickness (px)</div>
              <input
                type="number"
                min={0}
                max={16}
                step={1}
                value={thicknessInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setThicknessInput(val);
                  const t = parseInt(val, 10);
                  if (!Number.isNaN(t) && t >= 0) {
                    onThicknessChange(t);
                  }
                }}
                className="h-8 w-full rounded-sm border px-2 text-sm"
              />
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
                  onThicknessChange(thickness);
                }}
              >
                solid
              </Button>
              <Button
                variant={styleType === "dashed" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setStyleType("dashed");
                  onThicknessChange(thickness);
                }}
              >
                dashed
              </Button>
              <Button
                variant={styleType === "dotted" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setStyleType("dotted");
                  onThicknessChange(thickness);
                }}
              >
                dotted
              </Button>
              <Button
                variant={styleType === "double" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setStyleType("double");
                  onThicknessChange(thickness);
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

export function FrameColorToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState<string | undefined>(
    undefined,
  );
  const [_hasTarget, setHasTarget] = useState<boolean>(false);

  const getCurrentEntry = React.useCallback(() => {
    const entries = editor.api.blocks({ mode: "lowest" });
    return entries.length ? entries[0] : null;
  }, [editor]);

  const applyToCurrent = React.useCallback(
    (
      updater: (current: Record<string, any>, node: any) => Record<string, any>,
    ) => {
      const entry = getCurrentEntry();
      if (!entry) return;
      const [node, path] = entry as [any, any];
      const current = ((node as any).style || {}) as Record<string, any>;
      const next = updater(current, node);
      editor.tf.setNodes({ style: next }, { at: path });
    },
    [editor, getCurrentEntry],
  );

  const onUpdateColor = React.useCallback(
    (color: string) => {
      applyToCurrent((current, node) => {
        const isTable = (node as any).type === KEYS.table;
        if (isTable) {
          return { ...current, "--tableBorderColor": color } as Record<
            string,
            any
          >;
        }
        return { ...current, borderColor: color } as Record<string, any>;
      });
      setOpen(false);
    },
    [applyToCurrent],
  );

  const onClearColor = React.useCallback(() => {
    applyToCurrent((current, node) => {
      const isTable = (node as any).type === KEYS.table;
      if (isTable) {
        const next = { ...current } as Record<string, any>;
        delete next["--tableBorderColor"];
        return next;
      }
      const next = { ...current } as Record<string, any>;
      delete next.borderColor;
      return next;
    });
    setOpen(false);
  }, [applyToCurrent]);

  React.useEffect(() => {
    if (!open) return;
    const entry = getCurrentEntry();
    if (!entry) {
      setHasTarget(false);
      setCurrentColor(undefined);
      return;
    }
    const [node] = entry as [any, any];
    const current = ((node as any).style || {}) as Record<string, any>;
    const isTable = (node as any).type === KEYS.table;
    setHasTarget(true);
    setCurrentColor(
      isTable
        ? (current["--tableBorderColor"] as any)
        : (current.borderColor as any),
    );
  }, [open, getCurrentEntry]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Frame color">
          <PaletteIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[240px]"
      >
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Color</div>
            <ColorDropdownMenuItems
              colors={DEFAULT_COLORS}
              updateColor={(c) => {
                onUpdateColor(c);
              }}
              color={currentColor}
            />
            <DropdownMenuItem className="mt-2" onClick={onClearColor}>
              Clear color
            </DropdownMenuItem>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FrameLayoutToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = useState(false);
  const [_hasTarget, setHasTarget] = useState(false);
  const [mode, setMode] = useState<"block" | "content">("block");
  const [paddingXInput, setPaddingXInput] = useState<string>("0");
  const [paddingYInput, setPaddingYInput] = useState<string>("0");

  const getCurrentEntry = React.useCallback(() => {
    const entries = editor.api.blocks({ mode: "lowest" });
    return entries.length ? entries[0] : null;
  }, [editor]);

  const applyToCurrent = React.useCallback(
    (
      updater: (current: Record<string, any>, node: any) => Record<string, any>,
    ) => {
      const entry = getCurrentEntry();
      if (!entry) return;
      const [node, path] = entry as [any, any];
      const current = ((node as any).style || {}) as Record<string, any>;
      const next = updater(current, node);
      editor.tf.setNodes({ style: next }, { at: path });
    },
    [editor, getCurrentEntry],
  );

  React.useEffect(() => {
    if (!open) return;
    const entry = getCurrentEntry();
    if (!entry) {
      setHasTarget(false);
      return;
    }
    const [node] = entry as [any, any];
    const current = ((node as any).style || {}) as Record<string, any>;
    setHasTarget(true);

    const d = current.display as any;
    setMode(d === "inline-block" ? "content" : "block");

    const toNum = (v: any) => {
      if (typeof v === "string") {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
      }
      return (v as number) || 0;
    };

    const px = toNum(
      current.paddingLeft ?? current.paddingInline ?? current.padding,
    );
    const py = toNum(
      current.paddingTop ?? current.paddingBlock ?? current.padding,
    );
    setPaddingXInput(String(px || 0));
    setPaddingYInput(String(py || 0));
  }, [open, getCurrentEntry]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Content Layout" isDropdown>
          <LayoutGridIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[260px]"
      >
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Content Width</div>
            <div className="flex gap-2">
              <Button
                variant={mode === "block" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setMode("block");
                  applyToCurrent((current) => {
                    const next = { ...current } as Record<string, any>;
                    next.display = "block";
                    next["--frameMode"] = "block";
                    return next;
                  });
                }}
              >
                Max Width
              </Button>
              <Button
                variant={mode === "content" ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => {
                  setMode("content");
                  applyToCurrent((current) => {
                    const next = { ...current } as Record<string, any>;
                    next.display = "inline-block";
                    next["--frameMode"] = "content";
                    return next;
                  });
                }}
              >
                Container Width
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Padding</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs">X</span>
                <input
                  type="number"
                  min={0}
                  max={64}
                  step={1}
                  value={paddingXInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaddingXInput(val);
                    const p = parseInt(val, 10);
                    if (!Number.isNaN(p) && p >= 0) {
                      applyToCurrent((current) => {
                        const next = { ...current } as Record<string, any>;
                        delete (next as any).padding;
                        next.paddingLeft = `${p}px`;
                        next.paddingRight = `${p}px`;
                        return next;
                      });
                    }
                  }}
                  className="h-8 w-20 rounded-sm border px-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">Y</span>
                <input
                  type="number"
                  min={0}
                  max={64}
                  step={1}
                  value={paddingYInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaddingYInput(val);
                    const p = parseInt(val, 10);
                    if (!Number.isNaN(p) && p >= 0) {
                      applyToCurrent((current) => {
                        const next = { ...current } as Record<string, any>;
                        delete (next as any).padding;
                        next.paddingTop = `${p}px`;
                        next.paddingBottom = `${p}px`;
                        return next;
                      });
                    }
                  }}
                  className="h-8 w-20 rounded-sm border px-2 text-sm"
                />
              </div>
            </div>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FrameBackgroundToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const [currentBackground, setCurrentBackground] = React.useState<
    string | undefined
  >(undefined);
  const [_hasTarget, setHasTarget] = React.useState<boolean>(false);

  const getCurrentEntry = React.useCallback(() => {
    const entries = editor.api.blocks({ mode: "lowest" });
    return entries.length ? entries[0] : null;
  }, [editor]);

  const applyToCurrent = React.useCallback(
    (
      updater: (current: Record<string, any>, node: any) => Record<string, any>,
    ) => {
      const entry = getCurrentEntry();
      if (!entry) return;
      const [node, path] = entry as [any, any];
      const current = ((node as any).style || {}) as Record<string, any>;
      const next = updater(current, node);
      editor.tf.setNodes({ style: next }, { at: path });
    },
    [editor, getCurrentEntry],
  );

  const onUpdateBackground = React.useCallback(
    (color: string) => {
      applyToCurrent((current, node) => {
        const isTable = (node as any).type === KEYS.table;
        if (isTable) {
          return current as Record<string, any>;
        }
        return { ...current, backgroundColor: color } as Record<string, any>;
      });
      setOpen(false);
    },
    [applyToCurrent],
  );

  const onClearBackground = React.useCallback(() => {
    applyToCurrent((current, node) => {
      const isTable = (node as any).type === KEYS.table;
      if (isTable) {
        return current as Record<string, any>;
      }
      const next = { ...current } as Record<string, any>;
      delete next.backgroundColor;
      return next;
    });
    setOpen(false);
  }, [applyToCurrent]);

  React.useEffect(() => {
    if (!open) return;
    const entry = getCurrentEntry();
    if (!entry) {
      setHasTarget(false);
      setCurrentBackground(undefined);
      return;
    }
    const [node] = entry as [any, any];
    const current = ((node as any).style || {}) as Record<string, any>;
    const isTable = (node as any).type === KEYS.table;
    setHasTarget(true);
    setCurrentBackground(
      isTable ? undefined : (current.backgroundColor as any),
    );
  }, [open, getCurrentEntry]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Frame background">
          <PaintBucketIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[240px]"
      >
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <div className="mb-2 text-sm">Background</div>
            <ColorDropdownMenuItems
              colors={DEFAULT_COLORS}
              updateColor={(c) => {
                onUpdateBackground(c);
              }}
              color={currentBackground}
            />
            <DropdownMenuItem className="mt-2" onClick={onClearBackground}>
              Clear background
            </DropdownMenuItem>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
