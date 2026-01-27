"use client";

import { TrailingBlockPlugin, type Value } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";
import { mapPlugin } from "@heiso/core/components/editor/custom-plugins/google-map/google-map-plugin";
import { AIKit } from "@heiso/core/components/editor/plugins/ai-kit";
import { AlignKit } from "@heiso/core/components/editor/plugins/align-kit";
import { AutoformatKit } from "@heiso/core/components/editor/plugins/autoformat-kit";
import { BasicBlocksKit } from "@heiso/core/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@heiso/core/components/editor/plugins/basic-marks-kit";
import { BlockMenuKit } from "@heiso/core/components/editor/plugins/block-menu-kit";
import { BlockPlaceholderKit } from "@heiso/core/components/editor/plugins/block-placeholder-kit";
import { ButtonKit } from "@heiso/core/components/editor/plugins/button-kit";
import { CalloutKit } from "@heiso/core/components/editor/plugins/callout-kit";
import { CodeBlockKit } from "@heiso/core/components/editor/plugins/code-block-kit";
import { ColumnKit } from "@heiso/core/components/editor/plugins/column-kit";
import { CommentKit } from "@heiso/core/components/editor/plugins/comment-kit";
import { CopilotKit } from "@heiso/core/components/editor/plugins/copilot-kit";
import { CursorOverlayKit } from "@heiso/core/components/editor/plugins/cursor-overlay-kit";
import { DateKit } from "@heiso/core/components/editor/plugins/date-kit";
import { DiscussionKit } from "@heiso/core/components/editor/plugins/discussion-kit";
import { DndKit } from "@heiso/core/components/editor/plugins/dnd-kit";
import { DocxKit } from "@heiso/core/components/editor/plugins/docx-kit";
import { EmojiKit } from "@heiso/core/components/editor/plugins/emoji-kit";
import { ExitBreakKit } from "@heiso/core/components/editor/plugins/exit-break-kit";
import { FixedToolbarKit } from "@heiso/core/components/editor/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@heiso/core/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@heiso/core/components/editor/plugins/font-kit";
import { LineHeightKit } from "@heiso/core/components/editor/plugins/line-height-kit";
import { LinkKit } from "@heiso/core/components/editor/plugins/link-kit";
import { ListKit } from "@heiso/core/components/editor/plugins/list-kit";
import { MarkdownKit } from "@heiso/core/components/editor/plugins/markdown-kit";
import { MathKit } from "@heiso/core/components/editor/plugins/math-kit";
import { MediaKit } from "@heiso/core/components/editor/plugins/media-kit";
import { MentionKit } from "@heiso/core/components/editor/plugins/mention-kit";
import { SlashKit } from "@heiso/core/components/editor/plugins/slash-kit";
import { SuggestionKit } from "@heiso/core/components/editor/plugins/suggestion-kit";
import { TableKit } from "@heiso/core/components/editor/plugins/table-kit";
import { TocKit } from "@heiso/core/components/editor/plugins/toc-kit";
import { ToggleKit } from "@heiso/core/components/editor/plugins/toggle-kit";

export const EditorKit = [
  ...CopilotKit,
  ...AIKit,

  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...ButtonKit,
  ...MentionKit,
  mapPlugin,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...DocxKit,
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
