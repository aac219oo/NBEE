"use client";

import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import type { Value } from "platejs";
import { createSlateEditor, KEYS } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useDebounceCallback } from "usehooks-ts";
import { BaseEditorKit } from "@heiso/core/components/editor/editor-base-kit";
import { Editor, EditorContainer } from "@heiso/core/components/ui/editor";
import { EditorStatic } from "@heiso/core/components/ui/editor-static";
import { FixedToolbar } from "@heiso/core/components/ui/fixed-toolbar";
import { MarkToolbarButton } from "@heiso/core/components/ui/mark-toolbar-button";
import { cn } from "@heiso/core/lib/utils";
import { serializeHtmlCompat } from "../serialize-html-compat";
// import { Bold, Italic, Underline } from 'lucide-react'; // Example icons

export function MiniEditor({
  className,
  value,
  onChange,
}: {
  className?: string;
  value?: Value;
  onChange?: ({ value, html }: { value: Value; html: string }) => void;
}) {
  const editor = usePlateEditor({
    plugins: [BoldPlugin, ItalicPlugin, UnderlinePlugin],
    value,
  });

  const debouncedChange = useDebounceCallback(async (value: Value) => {
    const editorStatic = createSlateEditor({
      plugins: BaseEditorKit,
      value: editor.children,
    });

    const html = await serializeHtmlCompat(editorStatic, {
      editorComponent: EditorStatic,
      props: { variant: "fullWidth", editor: editorStatic },
      components: {
        [KEYS.p]: ({ element, attributes, children }: any) => (
          <p
            {...attributes}
            className={
              element?.style?.display === "inline-block"
                ? "inline-block"
                : undefined
            }
            style={(element as any).style}
          >
            {children}
          </p>
        ),
        [KEYS.h1]: ({ element, attributes, children }: any) => (
          <h1
            {...attributes}
            className={
              element?.style?.display === "inline-block"
                ? "inline-block"
                : undefined
            }
            style={(element as any).style}
          >
            {children}
          </h1>
        ),
        [KEYS.h2]: ({ element, attributes, children }: any) => (
          <h2
            {...attributes}
            className={
              element?.style?.display === "inline-block"
                ? "inline-block"
                : undefined
            }
            style={(element as any).style}
          >
            {children}
          </h2>
        ),
        [KEYS.h3]: ({ element, attributes, children }: any) => (
          <h3
            {...attributes}
            className={
              element?.style?.display === "inline-block"
                ? "inline-block"
                : undefined
            }
            style={(element as any).style}
          >
            {children}
          </h3>
        ),
        [KEYS.blockquote]: ({ element, attributes, children }: any) => (
          <blockquote
            {...attributes}
            className={
              element?.style?.display === "inline-block"
                ? "inline-block"
                : undefined
            }
            style={(element as any).style}
          >
            {children}
          </blockquote>
        ),
        [KEYS.img]: ({ element, attributes }: any) => (
          <div style={{ textAlign: element.align }}>
            <figure
              {...attributes}
              style={{ width: element.width, ...(element as any).style }}
            >
              <img
                src={element.url}
                alt={(attributes as any)?.alt}
                className="block h-auto max-w-full cursor-pointer object-contain px-0 rounded-sm"
              />
              {element.caption && (
                <figcaption className="mx-auto mt-2 h-[24px] max-w-full">
                  {element.caption[0]?.children?.[0]?.text || ""}
                </figcaption>
              )}
            </figure>
          </div>
        ),
        [KEYS.video]: ({ element, attributes }: any) => (
          <div style={{ textAlign: element.align }}>
            <figure
              {...attributes}
              style={{ width: element.width, ...(element as any).style }}
            >
              <video
                src={element.url}
                controls
                className="block max-w-full h-auto"
              />
            </figure>
          </div>
        ),
      },
    });

    console.log("html: ", html);
    onChange?.({ value, html });
  }, 500);

  return (
    <Plate editor={editor} onChange={({ value }) => debouncedChange(value)}>
      <FixedToolbar className="justify-start rounded-t-lg">
        <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
          B
        </MarkToolbarButton>
        <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
          I
        </MarkToolbarButton>
        <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
          U
        </MarkToolbarButton>
      </FixedToolbar>

      <EditorContainer>
        <Editor
          className={cn("max-h-[650px]", className)}
          variant="fullWidth"
          placeholder="Type your amazing content here..."
        />
      </EditorContainer>
    </Plate>
  );
}
