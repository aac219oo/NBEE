"use client";

import { buttonVariants } from "@heiso/core/components/ui/button";
import { Separator } from "@heiso/core/components/ui/separator";
import {
  flip,
  offset,
  type UseVirtualFloatingOptions,
} from "@platejs/floating";
import { getLinkAttributes } from "@platejs/link";
import {
  FloatingLinkUrlInput,
  type LinkFloatingToolbarState,
  useFloatingLinkEdit,
  useFloatingLinkEditState,
  useFloatingLinkInsert,
  useFloatingLinkInsertState,
} from "@platejs/link/react";
import { cva } from "class-variance-authority";
import { ExternalLink, Link, LinkIcon, Text, Unlink } from "lucide-react";
import type { TLinkElement } from "platejs";
import { KEYS } from "platejs";
import {
  useEditorRef,
  useEditorSelection,
  useFormInputProps,
  usePluginOption,
} from "platejs/react";
import * as React from "react";
import {
  ButtonBackgroundToolbarButton,
  ButtonBorderToolbarButton,
  ButtonPaddingToolbarButton,
} from "@heiso/core/components/editor/custom-plugins/button-tool/button-style-toolbar-buttons";
import { ButtonMediaToolbarButton } from "@heiso/core/components/ui/button-media-toolbar-button";
import { Toolbar } from "@heiso/core/components/ui/toolbar";

const popoverVariants = cva(
  "z-50 w-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden",
);

const inputVariants = cva(
  "flex h-[28px] w-full rounded-md border-none bg-transparent px-1.5 py-1 text-base placeholder:text-muted-foreground focus-visible:ring-transparent focus-visible:outline-none md:text-sm",
);

export function LinkFloatingToolbar({
  state,
}: {
  state?: LinkFloatingToolbarState;
}) {
  const editor = useEditorRef();
  const activeCommentId = usePluginOption({ key: KEYS.comment }, "activeId");
  const activeSuggestionId = usePluginOption(
    { key: KEYS.suggestion },
    "activeId",
  );

  const floatingOptions: UseVirtualFloatingOptions = React.useMemo(() => {
    return {
      middleware: [
        offset(8),
        flip({
          fallbackPlacements: ["bottom-end", "top-start", "top-end"],
          padding: 12,
        }),
      ],
      placement:
        activeSuggestionId || activeCommentId ? "top-start" : "bottom-start",
    };
  }, [activeCommentId, activeSuggestionId]);

  const insertState = useFloatingLinkInsertState({
    ...state,
    floatingOptions: {
      ...floatingOptions,
      ...state?.floatingOptions,
    },
  });
  const {
    hidden,
    props: insertProps,
    ref: insertRef,
    textInputProps,
  } = useFloatingLinkInsert(insertState);

  const editState = useFloatingLinkEditState({
    ...state,
    floatingOptions: {
      ...floatingOptions,
      ...state?.floatingOptions,
    },
  });
  const {
    editButtonProps,
    props: editProps,
    ref: editRef,
    unlinkButtonProps,
  } = useFloatingLinkEdit(editState);
  const inputProps = useFormInputProps({
    preventDefaultOnEnterKeydown: false,
  });

  if (hidden) return null;

  const input = (
    <div className="flex w-[330px] flex-col" {...inputProps}>
      <div className="flex items-center">
        <div className="flex items-center pr-1 pl-2 text-muted-foreground">
          <Link className="size-4" />
        </div>

        <FloatingLinkUrlInput
          className={inputVariants()}
          placeholder="Paste link"
          data-plate-focus
        />
      </div>
      <Separator className="my-1" />
      <div className="flex items-center">
        <div className="flex items-center pr-1 pl-2 text-muted-foreground">
          <Text className="size-4" />
        </div>
        <input
          className={inputVariants()}
          placeholder="Text to display"
          data-plate-focus
          {...textInputProps}
        />
      </div>
    </div>
  );

  const editContent = editState.isEditing ? (
    input
  ) : (
    <Toolbar className="box-content flex items-center">
      <button
        className={buttonVariants({ size: "sm", variant: "ghost" })}
        type="button"
        {...editButtonProps}
      >
        <LinkIcon />
      </button>

      <Separator orientation="vertical" />

      <LinkOpenButton />

      <Separator orientation="vertical" />

      <button
        className={buttonVariants({
          size: "sm",
          variant: "ghost",
        })}
        type="button"
        {...unlinkButtonProps}
      >
        <Unlink width={18} />
      </button>

      <Separator orientation="vertical" />

      {(() => {
        const entry = editor.api.node<TLinkElement>({
          match: { type: editor.getType(KEYS.link) },
        });
        const isButton = !!entry?.[0]?.asButton;
        if (!isButton) return null;
        return (
          <React.Fragment
            key={entry?.[1] ? JSON.stringify(entry[1]) : undefined}
          >
            <ButtonBackgroundToolbarButton />
            <Separator orientation="vertical" />
            <ButtonBorderToolbarButton />
            <Separator orientation="vertical" />
            <ButtonPaddingToolbarButton />
            <Separator orientation="vertical" />
            <ButtonMediaToolbarButton />
          </React.Fragment>
        );
      })()}
    </Toolbar>
  );

  return (
    <>
      <div
        ref={insertRef}
        className={popoverVariants()}
        {...(insertProps as any)}
      >
        {input}
      </div>

      <div ref={editRef} className={popoverVariants()} {...(editProps as any)}>
        {editContent}
      </div>
    </>
  );
}

function LinkOpenButton() {
  const editor = useEditorRef();
  const _selection = useEditorSelection();

  const attributes = React.useMemo(
    () => {
      const entry = editor.api.node<TLinkElement>({
        match: { type: editor.getType(KEYS.link) },
      });
      if (!entry) {
        return {};
      }
      const [element] = entry;
      return getLinkAttributes(editor, element);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor],
  );

  return (
    <a
      {...attributes}
      className={buttonVariants({
        size: "sm",
        variant: "ghost",
      })}
      target="_blank"
    >
      <ExternalLink width={18} />
    </a>
  );
}
