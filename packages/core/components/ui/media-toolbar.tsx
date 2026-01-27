"use client";

import { Button, buttonVariants } from "@heiso/core/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@heiso/core/components/ui/popover";
import { Separator } from "@heiso/core/components/ui/separator";
import {
  FloatingMedia as FloatingMediaPrimitive,
  FloatingMediaStore,
  useFloatingMediaValue,
  useImagePreviewValue,
} from "@platejs/media/react";
import { cva } from "class-variance-authority";
import { Link, LinkIcon, Trash2Icon, Unlink } from "lucide-react";
import type { WithRequiredKey } from "platejs";
import { KEYS, type TImageElement } from "platejs";
import {
  useEditorRef,
  useEditorSelector,
  useElement,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
} from "platejs/react";
import * as React from "react";

import { CaptionButton } from "./caption";

const inputVariants = cva(
  "flex h-[28px] w-full rounded-md border-none bg-transparent px-1.5 py-1 text-base placeholder:text-muted-foreground focus-visible:ring-transparent focus-visible:outline-none md:text-sm",
);

export function MediaToolbar({
  children,
  plugin,
}: {
  children: React.ReactNode;
  plugin: WithRequiredKey;
}) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const selected = useSelected();

  const selectionCollapsed = useEditorSelector(
    (editor) => !editor.api.isExpanded(),
    [],
  );
  const isImagePreviewOpen = useImagePreviewValue("isOpen", editor.id);
  const isOpen =
    !readOnly && selected && selectionCollapsed && !isImagePreviewOpen;
  const isEditing = useFloatingMediaValue("isEditing");

  // Keep editing state; do not auto-reset here to avoid blocking panel open

  const element = useElement();
  const { props: buttonProps } = useRemoveNodeButton({ element });
  const el = element as TImageElement & { linkUrl?: string };
  const [linkValue, setLinkValue] = React.useState<string>(el?.linkUrl ?? "");
  React.useEffect(() => {
    setLinkValue(el?.linkUrl ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el?.linkUrl]);
  const onChangeLink = React.useCallback(
    (value: string) => {
      const entry = editor.api.node<TImageElement>({
        match: { type: editor.getType(KEYS.img) },
      });
      if (!entry) return;
      const [, path] = entry;
      const href = value.trim();
      if (href) {
        editor.tf.setNodes({ linkUrl: href }, { at: path });
      } else {
        editor.tf.unsetNodes(["linkUrl"], { at: path });
      }
    },
    [editor],
  );

  if (readOnly) return <>{children}</>;

  return (
    <Popover
      open={isOpen || (isEditing && selected && selectionCollapsed)}
      modal={false}
    >
      <PopoverAnchor>{children}</PopoverAnchor>

      <PopoverContent
        className="w-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            FloatingMediaStore.set("isEditing", false);
          }
        }}
      >
        {isEditing ? (
          <div className="flex w-[350px] flex-col">
            <div className="flex items-center">
              <div className="flex items-center pr-1 pl-2 text-muted-foreground">
                <Link className="size-4" />
              </div>
              <span className="mr-2 text-xs text-muted-foreground text-nowrap">
                Image URL:
              </span>
              <FloatingMediaPrimitive.UrlInput
                className={inputVariants()}
                placeholder="Paste the image url..."
                options={{ plugin }}
              />
            </div>
            <div className="mt-2 flex items-center text-nowrap">
              <div className="flex items-center pr-1 pl-2 text-muted-foreground">
                <Link className="size-4" />
              </div>
              <span className="mr-2 text-xs text-muted-foreground">
                Target Link:
              </span>
              <input
                className={inputVariants()}
                placeholder="Open link"
                value={linkValue}
                onChange={(e) => {
                  setLinkValue(e.target.value);
                  onChangeLink(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onChangeLink(linkValue);
                    FloatingMediaStore.set("isEditing", false);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    FloatingMediaStore.set("isEditing", false);
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="box-content flex items-center">
            <CaptionButton size="sm" variant="ghost">
              Caption
            </CaptionButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <FloatingMediaPrimitive.EditButton
              className={buttonVariants({ size: "sm", variant: "ghost" })}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => FloatingMediaStore.set("isEditing", true)}
            >
              <LinkIcon />
            </FloatingMediaPrimitive.EditButton>

            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChangeLink("")}
            >
              <Unlink />
            </Button>

            <Button size="sm" variant="ghost" {...buttonProps}>
              <Trash2Icon />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
