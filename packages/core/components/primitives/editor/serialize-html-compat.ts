import { serializeHtml as serializeHtmlOriginal } from "platejs";
import type React from "react";
import type { HTMLAttributes } from "react";

export type HtmlComponentRendererArgs = {
  element: any;
  attributes: HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
};

export type HtmlComponentRenderer = (
  args: HtmlComponentRendererArgs,
) => React.ReactNode;

export type SerializeHtmlOptionsCompat<P> = {
  editorComponent: React.ComponentType<P>;
  props?: P;
  components?: Record<string, HtmlComponentRenderer>;
};

export async function serializeHtmlCompat<P>(
  editor: any,
  options: SerializeHtmlOptionsCompat<P>,
): Promise<string> {
  // Cast to any to bridge library's narrowed type while keeping local type safety
  return await serializeHtmlOriginal(editor, options as any);
}
