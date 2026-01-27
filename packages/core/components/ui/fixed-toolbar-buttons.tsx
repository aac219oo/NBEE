"use client";

import {
  BaselineIcon,
  BoldIcon,
  Code2Icon,
  HighlighterIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import type * as React from "react";
import { ButtonToolbarButton } from "../editor/custom-plugins/button-tool/button-toolbar-button";
import { GoogleMapToolbarButton } from "../editor/custom-plugins/google-map/google-map-toolbar-button";
import { AlignToolbarButton } from "./align-toolbar-button";
import { EmojiToolbarButton } from "./emoji-toolbar-button";
import { FontColorToolbarButton } from "./font-color-toolbar-button";
import { FontSizeToolbarButton } from "./font-size-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "./history-toolbar-button";
import {
  IndentToolbarButton,
  OutdentToolbarButton,
} from "./indent-toolbar-button";
import { LineHeightToolbarButton } from "./line-height-toolbar-button";
import { LinkToolbarButton } from "./link-toolbar-button";
import { MarkToolbarButton } from "./mark-toolbar-button";
import { MediaToolbarButton } from "./media-toolbar-button";
import { MoreToolbarButton } from "./more-toolbar-button";
import { ToolbarGroup } from "./toolbar";

export function FixedToolbarButtons(
  props: React.ComponentProps<typeof ToolbarGroup>,
) {
  const readOnly = useEditorReadOnly();

  return (
    <div className="flex w-full" {...props}>
      {!readOnly && (
        <>
          <ToolbarGroup>
            <UndoToolbarButton />
            <RedoToolbarButton />
          </ToolbarGroup>

          {/* <ToolbarGroup>
            <AIToolbarButton tooltip="AI commands">
              <WandSparklesIcon />
            </AIToolbarButton>
          </ToolbarGroup> */}

          {/* <ToolbarGroup>
            <ExportToolbarButton>
              <ArrowUpToLineIcon />
            </ExportToolbarButton>

            <ImportToolbarButton />
          </ToolbarGroup> */}

          <ToolbarGroup>
            {/* <InsertToolbarButton /> */}
            {/* <TurnIntoToolbarButton /> */}
            <FontSizeToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
              <BoldIcon />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
              <ItalicIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.underline}
              tooltip="Underline (⌘+U)"
            >
              <UnderlineIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.strikethrough}
              tooltip="Strikethrough (⌘+⇧+M)"
            >
              <StrikethroughIcon />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
              <Code2Icon />
            </MarkToolbarButton>

            <FontColorToolbarButton nodeType={KEYS.color} tooltip="Text color">
              <BaselineIcon />
            </FontColorToolbarButton>

            <FontColorToolbarButton
              nodeType={KEYS.backgroundColor}
              tooltip="Background color"
            >
              <HighlighterIcon />
            </FontColorToolbarButton>
            <LineHeightToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <AlignToolbarButton />

            {/* <NumberedListToolbarButton />
            <BulletedListToolbarButton />
            <TodoListToolbarButton />
            <ToggleToolbarButton /> */}
          </ToolbarGroup>

          <ToolbarGroup>
            <LinkToolbarButton />
            <ButtonToolbarButton />
            {/* <TableToolbarButton /> */}
            <EmojiToolbarButton />
          </ToolbarGroup>

          {/* 未成功，在html是失敗的 */}
          {/* <ToolbarGroup>
            <FrameBorderToolbarButton />
            <FrameLayoutToolbarButton />
            <FrameBackgroundToolbarButton />
            <FrameColorToolbarButton />
          </ToolbarGroup> */}

          <ToolbarGroup>
            <MediaToolbarButton nodeType={KEYS.img} />
            <MediaToolbarButton nodeType={KEYS.video} />
            {/* <MediaToolbarButton nodeType={KEYS.audio} /> */}
            {/* <MediaToolbarButton nodeType={KEYS.file} /> */}
            <GoogleMapToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <OutdentToolbarButton />
            <IndentToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <MoreToolbarButton />
          </ToolbarGroup>
        </>
      )}

      <div className="grow" />

      {/* <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.highlight} tooltip="Highlight">
          <HighlighterIcon />
        </MarkToolbarButton>
        <CommentToolbarButton />
      </ToolbarGroup> */}

      {/* <ToolbarGroup>
        <ModeToolbarButton />
      </ToolbarGroup> */}

      {props.children}
    </div>
  );
}
