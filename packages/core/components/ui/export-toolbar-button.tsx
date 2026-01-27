"use client";

import { buttonVariants } from "@heiso/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@heiso/core/components/ui/dropdown-menu";
import { MarkdownPlugin } from "@platejs/markdown";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import * as Icons from "lucide-react";
import { ArrowDownToLineIcon } from "lucide-react";
import { createSlateEditor, KEYS } from "platejs";
import { useEditorRef } from "platejs/react";
import * as React from "react";
import { BaseEditorKit } from "@heiso/core/components/editor/editor-base-kit";
import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import { serializeHtmlCompat } from "../primitives/editor/serialize-html-compat";

import { EditorStatic } from "./editor-static";
import { ToolbarButton } from "./toolbar";

const siteUrl = "https://platejs.org";

export function ExportToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const getCanvas = async () => {
    const { default: html2canvas } = await import("html2canvas-pro");

    const style = document.createElement("style");
    document.head.append(style);

    const canvas = await html2canvas(editor.api.toDOMNode(editor)!, {
      onclone: (document: Document) => {
        const editorElement = document.querySelector(
          '[contenteditable="true"]',
        );
        if (editorElement) {
          Array.from(editorElement.querySelectorAll("*")).forEach((element) => {
            const existingStyle = element.getAttribute("style") || "";
            element.setAttribute(
              "style",
              `${existingStyle}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important`,
            );
          });
        }
      },
    });
    style.remove();

    return canvas;
  };

  const downloadFile = async (url: string, filename: string) => {
    const response = await fetch(url);

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();

    // Clean up the blob URL
    window.URL.revokeObjectURL(blobUrl);
  };

  const exportToPdf = async () => {
    const canvas = await getCanvas();

    const PDFLib = await import("pdf-lib");
    const pdfDoc = await PDFLib.PDFDocument.create();
    const page = pdfDoc.addPage([canvas.width, canvas.height]);
    const imageEmbed = await pdfDoc.embedPng(canvas.toDataURL("PNG"));
    const { height, width } = imageEmbed.scale(1);
    page.drawImage(imageEmbed, {
      height,
      width,
      x: 0,
      y: 0,
    });
    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: true });

    await downloadFile(pdfBase64, "plate.pdf");
  };

  const exportToImage = async () => {
    const canvas = await getCanvas();
    await downloadFile(canvas.toDataURL("image/png"), "plate.png");
  };

  const exportToHtml = async () => {
    const editorStatic = createSlateEditor({
      plugins: BaseEditorKit,
      value: editor.children,
    });

    const editorHtml = await serializeHtmlCompat(editorStatic, {
      editorComponent: EditorStatic,
      props: {
        style: { padding: "0 calc(50% - 350px)" },
        editor: editorStatic,
      },
      components: {
        [KEYS.link]: ({ element, attributes, children }: any) => {
          const base = extractFrameStyles(element) as any;
          const isButton = !!element.asButton;
          const variant = element.variant || "default";
          const size = element.size || "default";

          const { icon, image, mediaPosition = "left", iconColor } = element;
          const Icon = icon && (Icons as any)[icon];
          const hasMedia = !!image || !!Icon;
          const mediaContent = (() => {
            if (image)
              return (
                <img
                  src={image}
                  alt=""
                  style={{
                    height: "1.2em",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              );
            if (Icon)
              return (
                <Icon
                  style={{
                    width: "1em",
                    height: "1em",
                    color: iconColor || "currentColor",
                  }}
                />
              );
            return null;
          })();

          const cls = isButton
            ? `${buttonVariants({ variant, size })} h-auto transition-opacity hover:opacity-80 flex items-center gap-2 w-fit no-underline`
            : "font-medium text-primary underline decoration-primary underline-offset-4";
          if (!isButton) {
            return (
              <a
                {...attributes}
                href={element.url}
                target={element.target}
                rel={element.rel}
                className={cls}
              >
                {mediaPosition === "left" && mediaContent}
                {children}
                {mediaPosition === "right" && mediaContent}
              </a>
            );
          }
          const { marginTop, marginBottom, marginLeft, marginRight, ...rest } =
            base as any;
          const alignClass =
            marginLeft === "auto" && marginRight === "auto"
              ? "mx-auto"
              : marginLeft === "auto" && marginRight === "0"
                ? "ml-auto"
                : marginLeft === "0" && marginRight === "auto"
                  ? "mr-auto"
                  : undefined;
          const restNoWidth = { ...rest } as any;
          delete restNoWidth.width;
          delete (restNoWidth as any).display;
          const justifyContent =
            rest.justifyContent ??
            (rest.textAlign === "center"
              ? "center"
              : rest.textAlign === "right"
                ? "flex-end"
                : rest.textAlign === "left"
                  ? "flex-start"
                  : undefined);
          return (
            <a
              {...attributes}
              href={element.url}
              target={element.target}
              rel={element.rel}
              className={alignClass ? `${cls} ${alignClass}` : cls}
              style={{
                display: hasMedia ? "flex" : "block",
                alignItems: "center",
                gap: "0.5rem",
                justifyContent: justifyContent,
                height: "auto",
                backgroundColor: rest.backgroundColor ?? "hsl(var(--primary))",
                color: rest.color ?? "hsl(var(--primary-foreground))",
                borderRadius: rest.borderRadius ?? "0.375rem",
                padding: rest.padding ?? undefined,
                paddingLeft:
                  rest.paddingLeft ?? (rest.padding ? undefined : "1rem"),
                paddingRight:
                  rest.paddingRight ?? (rest.padding ? undefined : "1rem"),
                paddingTop:
                  rest.paddingTop ?? (rest.padding ? undefined : "0.5rem"),
                paddingBottom:
                  rest.paddingBottom ?? (rest.padding ? undefined : "0.5rem"),
                width: rest.width ?? "fit-content",
                marginTop,
                marginBottom,
                marginLeft,
                marginRight,
                ...restNoWidth,
              }}
            >
              {mediaPosition === "left" && mediaContent}
              {children}
              {mediaPosition === "right" && mediaContent}
            </a>
          );
        },
        button: ({ element, attributes, children }: any) => {
          const styles = extractFrameStyles(element) as any;
          const variant = element.variant || "default";
          const size = element.size || "default";

          const { icon, image, mediaPosition = "left", iconColor } = element;
          const Icon = icon && (Icons as any)[icon];
          const hasMedia = !!image || !!Icon;
          const mediaContent = (() => {
            if (image)
              return (
                <img
                  src={image}
                  alt=""
                  style={{
                    height: "1.2em",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              );
            if (Icon)
              return (
                <Icon
                  style={{
                    width: "1em",
                    height: "1em",
                    color: iconColor || "currentColor",
                  }}
                />
              );
            return null;
          })();

          const cls = `${buttonVariants({ variant, size })} h-auto transition-opacity hover:opacity-80 w-fit`;
          const ml2 = (styles as any)?.marginLeft as any;
          const mr2 = (styles as any)?.marginRight as any;
          const alignClass2 =
            ml2 === "auto" && mr2 === "auto"
              ? "mx-auto"
              : ml2 === "auto" && mr2 === "0"
                ? "ml-auto"
                : ml2 === "0" && mr2 === "auto"
                  ? "mr-auto"
                  : undefined;
          return (
            <a
              {...attributes}
              href={element.url}
              target={element.target}
              rel={element.rel}
              className={
                alignClass2
                  ? `${cls} ${alignClass2} no-underline`
                  : `${cls} no-underline`
              }
              style={{
                ...styles,
                textAlign:
                  styles.textAlign ??
                  (styles.justifyContent === "center"
                    ? "center"
                    : styles.justifyContent === "flex-end"
                      ? "right"
                      : styles.justifyContent === "flex-start"
                        ? "left"
                        : undefined),
                height: "auto",
                width: (styles as any)?.width ?? "fit-content",
                display: hasMedia ? "flex" : "block",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {mediaPosition === "left" && mediaContent}
              {children}
              {mediaPosition === "right" && mediaContent}
            </a>
          );
        },
        [KEYS.p]: ({ element, attributes, children }: any) => {
          const styles = extractFrameStyles(element);
          const inlineClass =
            styles.display === "inline-block" ? "inline-block" : undefined;
          const hasOnlyButtonAndEmptyTexts = Array.isArray(element?.children)
            ? element.children.every((c: any) => {
              const isLink = c?.type === KEYS.link || c?.type === "link";
              const txt =
                typeof c?.text === "string"
                  ? c.text.replace(/\uFEFF/g, "").trim()
                  : null;
              const isEmptyText = txt !== null && txt.length === 0;
              return isLink || isEmptyText;
            })
            : false;
          const style = hasOnlyButtonAndEmptyTexts
            ? { ...styles, fontSize: 0, lineHeight: 0 }
            : styles;
          return (
            <p {...attributes} className={inlineClass} style={style}>
              {children}
            </p>
          );
        },
        [KEYS.h1]: ({ element, attributes, children }: any) => {
          const styles = extractFrameStyles(element);
          const inlineClass =
            styles.display === "inline-block" ? "inline-block" : undefined;
          return (
            <h1 {...attributes} className={inlineClass} style={styles}>
              {children}
            </h1>
          );
        },
        [KEYS.h2]: ({ element, attributes, children }: any) => {
          const styles = extractFrameStyles(element);
          const inlineClass =
            styles.display === "inline-block" ? "inline-block" : undefined;
          return (
            <h2 {...attributes} className={inlineClass} style={styles}>
              {children}
            </h2>
          );
        },
        [KEYS.h3]: ({ element, attributes, children }: any) => {
          const styles = extractFrameStyles(element);
          const inlineClass =
            styles.display === "inline-block" ? "inline-block" : undefined;
          return (
            <h3 {...attributes} className={inlineClass} style={styles}>
              {children}
            </h3>
          );
        },
        [KEYS.blockquote]: ({ element, attributes, children }: any) => {
          const styles = extractFrameStyles(element);
          const inlineClass =
            styles.display === "inline-block" ? "inline-block" : undefined;
          return (
            <blockquote {...attributes} className={inlineClass} style={styles}>
              {children}
            </blockquote>
          );
        },
        [KEYS.img]: ({ element, attributes }: any) => {
          const styles = extractFrameStyles(element);
          return (
            <div style={{ textAlign: element.align }}>
              <figure
                {...attributes}
                style={{ width: element.width, ...styles }}
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
          );
        },
        [KEYS.video]: ({ element, attributes }: any) => {
          const styles = extractFrameStyles(element);
          return (
            <div style={{ textAlign: element.align }}>
              <figure
                {...attributes}
                style={{ width: element.width, ...styles }}
              >
                <img
                  src={element.url}
                  className="block h-auto max-w-full cursor-pointer object-contain px-0 rounded-sm"
                />
              </figure>
            </div>
          );
        },
      },
    });

    const tailwindCss = `<link rel="stylesheet" href="${siteUrl}/tailwind.css">`;
    const katexCss = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.18/dist/katex.css" integrity="sha384-9PvLvaiSKCPkFKB1ZsEoTjgnJn+O3KvEwtsz37/XrkYft3DTk2gHdYvd9oWgW3tV" crossorigin="anonymous">`;

    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..700&display=swap"
          rel="stylesheet"
        />
        ${tailwindCss}
        ${katexCss}
        <style>
          :root {
            --font-sans: 'Inter', 'Inter Fallback';
            --font-mono: 'JetBrains Mono', 'JetBrains Mono Fallback';
          }
        </style>
      </head>
      <body>
        ${editorHtml}
      </body>
    </html>`;

    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

    await downloadFile(url, "plate.html");
  };

  const exportToMarkdown = async () => {
    const md = editor.getApi(MarkdownPlugin).markdown.serialize();
    const url = `data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`;
    await downloadFile(url, "plate.md");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Export" isDropdown>
          <ArrowDownToLineIcon className="size-4" />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={exportToHtml}>
            Export as HTML
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={exportToPdf}>
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={exportToImage}>
            Export as Image
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={exportToMarkdown}>
            Export as Markdown
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
