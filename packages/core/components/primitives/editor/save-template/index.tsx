"use client";

import { buttonVariants } from "@heiso/core/components/ui/button";
import { Input } from "@heiso/core/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@heiso/core/components/ui/sheet";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { FileCode2, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createSlateEditor, KEYS, type Value } from "platejs";
import {
  createPlatePlugin,
  Plate,
  useEditorRef,
  usePlateEditor,
} from "platejs/react";
import * as React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";
import { getPost } from "@heiso/core/server/post.service";
import {
  deleteTemplate,
  getTemplateById,
  getTemplatesList,
  type TemplateItem,
} from "@heiso/core/server/templates.service";
import { MapElementStatic } from "@heiso/core/components/editor/custom-plugins/google-map/google-map-plugin";
import { BaseEditorKit } from "@heiso/core/components/editor/editor-base-kit";
import { EditorKit } from "@heiso/core/components/editor/editor-kit";
import { KEY_MAP } from "@heiso/core/components/editor/plate-types";
import { Editor, EditorContainer } from "@heiso/core/components/ui/editor";
import { EditorStatic } from "@heiso/core/components/ui/editor-static";
import { FixedToolbar } from "@heiso/core/components/ui/fixed-toolbar";
import { FixedToolbarButtons } from "@heiso/core/components/ui/fixed-toolbar-buttons";
// For exact HTML fidelity, define lightweight serializers that emit raw tags with inline styles
import { ToolbarButton, ToolbarGroup } from "@heiso/core/components/ui/toolbar";
import { cn } from "@heiso/core/lib/utils";
import { serializeHtmlCompat } from "../serialize-html-compat";
import { SaveTemplateDialog } from "./save-template-dialog";

import {
  extractFrameStyles,
  generateYoutubeEmbedSrc,
  getYoutubeId,
  sanitizeUrl,
} from "../utils";

export interface BlockEditorRef {
  editor: ReturnType<typeof usePlateEditor>;
  getValue: () => Value;
  setValue: (value: Value) => void;
  getHtml: () => Promise<string>;
}

interface BlockEditorProps {
  editorClassName?: string;
  containerClassName?: string;
  disable?: boolean;
  variant?: React.ComponentProps<typeof Editor>["variant"];
  value?: Value;
  onChange?: ({ value, html }: { value: Value; html: string }) => void;
  toolVisibility?: {
    showTemplateListButton?: boolean;
    showSaveTemplateButton?: boolean;
  };
  webEditor?: Value | undefined;
  mobileEditor?: Value | undefined;
  onTemplateSelect?: (templateId: string) => void;
  currentSavedTemplateId?: string;
}

export const BlockEditor = React.forwardRef<BlockEditorRef, BlockEditorProps>(
  function BlockEditor(
    {
      editorClassName,
      containerClassName,
      disable = false,
      variant = "fullWidth",
      value,
      onChange,
      toolVisibility,
      webEditor,
      mobileEditor,
      onTemplateSelect,
      currentSavedTemplateId,
    },
    ref,
  ) {
    const t = useTranslations("components.posts.edit.template");
    // 從 URL 中獲取 postId
    const currentUrl = window.location.pathname;
    const regex = /post\/(.*?)\/edit/;
    const match = currentUrl.match(regex);
    const fetchPostId = match?.[1] || null;

    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [existingTemplate, setExistingTemplate] = useState<{
      id: string;
      name: string;
      description?: string;
    } | null>(null);
    const internalRef = useRef<BlockEditorRef>(null);

    const clickSaveTemplateHandler = useCallback(
      async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        toast.info(t("loading"));
        if (!fetchPostId) {
          toast.error(t("error.noPostId"));
          return;
        }

        const existingPost = await getPost(fetchPostId);
        if (!existingPost) {
          toast.error(t("error.postNotFound"));
          return;
        }

        // 如果文章有關聯的模板，預先讀取模板資料
        if (existingPost?.savedTemplateId) {
          try {
            const templateData = await getTemplateById(
              existingPost?.savedTemplateId,
            );
            if (templateData) {
              setExistingTemplate({
                id: templateData.id,
                name: templateData.name,
                description: templateData.description || "",
              });
            }
            toast.dismiss();
          } catch (error) {
            console.error("獲取模板資訊失敗:", error);
            setExistingTemplate(null);
          }
        } else {
          setExistingTemplate(null);
        }

        setIsTemplateDialogOpen(true);
      },
      [fetchPostId, t],
    );

    const plugins = useMemo(() => {
      let list = [...EditorKit];
      list = list.filter((p: any) => p?.key !== "fixed-toolbar");
      list.push(
        createPlatePlugin({
          key: "fixed-toolbar",
          render: {
            beforeEditable: () => (
              <FixedToolbar>
                <FixedToolbarButtons>
                  {(toolVisibility?.showTemplateListButton ||
                    toolVisibility?.showSaveTemplateButton) && (
                      <ToolbarGroup>
                        {toolVisibility?.showTemplateListButton && (
                          <TemplateList
                            openMobileEditor={webEditor !== undefined}
                          />
                        )}
                        {toolVisibility?.showSaveTemplateButton && (
                          <ToolbarButton
                            tooltip={t("saveTemplate")}
                            onClick={clickSaveTemplateHandler}
                          >
                            <Save className="size-4" />
                          </ToolbarButton>
                        )}
                      </ToolbarGroup>
                    )}
                </FixedToolbarButtons>
              </FixedToolbar>
            ),
          },
        }),
      );

      return list;
    }, [toolVisibility, t, clickSaveTemplateHandler, webEditor]);

    const editor = usePlateEditor({
      plugins,
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
          [KEY_MAP]: (props: any) => {
            return <MapElementStatic {...props} />;
          },
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
            const {
              marginTop,
              marginBottom,
              marginLeft,
              marginRight,
              ...rest
            } = base as any;
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
                  backgroundColor:
                    rest.backgroundColor ?? "hsl(var(--primary))",
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

            const justifyContent =
              styles.justifyContent ??
              (styles.textAlign === "center"
                ? "center"
                : styles.textAlign === "right"
                  ? "flex-end"
                  : styles.textAlign === "left"
                    ? "flex-start"
                    : undefined);

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
                  justifyContent: justifyContent,
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
            const _hasOnlyButtonAndEmptyTexts = Array.isArray(element?.children)
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
            const style = styles;
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
              <blockquote
                {...attributes}
                className={inlineClass}
                style={styles}
              >
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
            const _styles = extractFrameStyles(element);
            const rawUrl: string = element.url;
            const url = sanitizeUrl(rawUrl);
            const ytId = getYoutubeId(url);
            const embedSrc =
              generateYoutubeEmbedSrc(url) ||
              (ytId ? `https://www.youtube.com/embed/${ytId}` : null);
            return (
              <div style={{ textAlign: element.align }}>
                <figure
                  {...attributes}
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 9",
                  }}
                >
                  {embedSrc ? (
                    <iframe
                      title="YouTube video player"
                      width="560"
                      height="315"
                      src={embedSrc}
                      className="absolute top-0 left-0 w-full h-full rounded-[3px]"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      frameBorder="0"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={url}
                      controls
                      muted
                      aria-label={
                        (element as any)?.ariaLabel ?? "Video content"
                      }
                      className="block max-w-full h-auto"
                    >
                      {(element as any)?.captionsSrc ? (
                        <track
                          kind="captions"
                          srcLang={(element as any)?.captionsLang ?? "zh"}
                          label={(element as any)?.captionsLabel ?? "Captions"}
                          src={(element as any)?.captionsSrc}
                          default
                        />
                      ) : null}
                    </video>
                  )}
                </figure>
              </div>
            );
          },

          [KEYS.mediaEmbed]: ({ element, attributes }: any) => {
            const _styles = extractFrameStyles(element);
            const rawUrl: string = element.url;
            const url = sanitizeUrl(rawUrl);
            const ytId = getYoutubeId(url);
            const src =
              generateYoutubeEmbedSrc(url) ||
              (ytId ? `https://www.youtube.com/embed/${ytId}` : url);
            return (
              <div style={{ textAlign: element.align }}>
                <figure
                  {...attributes}
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 9",
                  }}
                >
                  <iframe
                    title="YouTube video player"
                    width="560"
                    height="315"
                    src={src}
                    className="absolute top-0 left-0 w-full h-full rounded-[3px]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </figure>
              </div>
            );
          },
        },
      });

      console.log("html: ", html, "----", editorStatic.children);
      onChange?.({ value, html });
    }, 200);

    // Expose ref methods
    React.useImperativeHandle(ref, () => {
      const editorRef = {
        editor,
        getValue: () => editor.children,
        setValue: (value: Value) => {
          editor.tf.setValue(value);
        },
        getHtml: async () => {
          const editorStatic = createSlateEditor({
            plugins: BaseEditorKit,
            value: editor.children,
          });
          return await serializeHtmlCompat(editorStatic, {
            editorComponent: EditorStatic,
            props: { variant: "fullWidth", editor: editorStatic },
            components: {
              [KEYS.link]: ({ element, attributes, children }: any) => {
                const base = extractFrameStyles(element) as any;
                const isButton = !!element.asButton;
                const variant = element.variant || "default";
                const size = element.size || "default";

                const {
                  icon,
                  image,
                  mediaPosition = "left",
                  iconColor,
                } = element;
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
                const {
                  marginTop,
                  marginBottom,
                  marginLeft,
                  marginRight,
                  ...rest
                } = base as any;
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
                      backgroundColor:
                        rest.backgroundColor ?? "hsl(var(--primary))",
                      color: rest.color ?? "hsl(var(--primary-foreground))",
                      borderRadius: rest.borderRadius ?? "0.375rem",
                      padding: rest.padding ?? undefined,
                      paddingLeft:
                        rest.paddingLeft ?? (rest.padding ? undefined : "1rem"),
                      paddingRight:
                        rest.paddingRight ??
                        (rest.padding ? undefined : "1rem"),
                      paddingTop:
                        rest.paddingTop ??
                        (rest.padding ? undefined : "0.5rem"),
                      paddingBottom:
                        rest.paddingBottom ??
                        (rest.padding ? undefined : "0.5rem"),
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
              [KEYS.mediaEmbed]: ({ element, attributes }: any) => {
                const _styles = extractFrameStyles(element);
                const rawUrl: string = element.url;
                const url = sanitizeUrl(rawUrl);
                const ytId = getYoutubeId(url);
                const src =
                  generateYoutubeEmbedSrc(url) ||
                  (ytId ? `https://www.youtube.com/embed/${ytId}` : url);
                return (
                  <div style={{ textAlign: element.align }}>
                    <figure
                      {...attributes}
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "16 / 9",
                      }}
                    >
                      <iframe
                        title="YouTube video player"
                        width="560"
                        height="315"
                        src={src}
                        className="block w-full aspect-video rounded-[3px]"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        frameBorder="0"
                        allowFullScreen
                      />
                    </figure>
                  </div>
                );
              },
              [KEY_MAP]: (props: any) => {
                return <MapElementStatic {...props} />;
              },
              button: ({ element, attributes, children }: any) => {
                const styles = extractFrameStyles(element) as any;
                const variant = element.variant || "default";
                const size = element.size || "default";

                const {
                  icon,
                  image,
                  mediaPosition = "left",
                  iconColor,
                } = element;
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
                  styles.display === "inline-block"
                    ? "inline-block"
                    : undefined;
                const hasOnlyButtonAndEmptyTexts = Array.isArray(
                  element?.children,
                )
                  ? element.children.every((c: any) => {
                    const isLink =
                      c?.type === KEYS.link || c?.type === "link";
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
                  styles.display === "inline-block"
                    ? "inline-block"
                    : undefined;
                return (
                  <h1 {...attributes} className={inlineClass} style={styles}>
                    {children}
                  </h1>
                );
              },
              [KEYS.h2]: ({ element, attributes, children }: any) => {
                const styles = extractFrameStyles(element);
                const inlineClass =
                  styles.display === "inline-block"
                    ? "inline-block"
                    : undefined;
                return (
                  <h2 {...attributes} className={inlineClass} style={styles}>
                    {children}
                  </h2>
                );
              },
              [KEYS.h3]: ({ element, attributes, children }: any) => {
                const styles = extractFrameStyles(element);
                const inlineClass =
                  styles.display === "inline-block"
                    ? "inline-block"
                    : undefined;
                return (
                  <h3 {...attributes} className={inlineClass} style={styles}>
                    {children}
                  </h3>
                );
              },
              [KEYS.blockquote]: ({ element, attributes, children }: any) => {
                const styles = extractFrameStyles(element);
                const inlineClass =
                  styles.display === "inline-block"
                    ? "inline-block"
                    : undefined;
                return (
                  <blockquote
                    {...attributes}
                    className={inlineClass}
                    style={styles}
                  >
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
                const _styles = extractFrameStyles(element);
                const rawUrl: string = element.url;
                const url = sanitizeUrl(rawUrl);
                const ytId = getYoutubeId(url);
                const embedSrc =
                  generateYoutubeEmbedSrc(url) ||
                  (ytId ? `https://www.youtube.com/embed/${ytId}` : null);
                return (
                  <div style={{ textAlign: element.align }}>
                    <figure
                      {...attributes}
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "16 / 9",
                      }}
                    >
                      {embedSrc ? (
                        <iframe
                          title="YouTube video player"
                          src={embedSrc}
                          width="560"
                          height="315"
                          className="absolute top-0 left-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          frameBorder="0"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={url}
                          controls
                          muted
                          aria-label={
                            (element as any)?.ariaLabel ?? "Video content"
                          }
                          className="block max-w-full h-auto"
                        >
                          {(element as any)?.captionsSrc ? (
                            <track
                              kind="captions"
                              srcLang={(element as any)?.captionsLang ?? "zh"}
                              label={
                                (element as any)?.captionsLabel ?? "Captions"
                              }
                              src={(element as any)?.captionsSrc}
                              default
                            />
                          ) : null}
                        </video>
                      )}
                    </figure>
                  </div>
                );
              },
            },
          });
        },
      };
      internalRef.current = editorRef;
      return editorRef;
    }, [editor]);

    return (
      <>
        <Plate editor={editor} onChange={({ value }) => debouncedChange(value)}>
          <EditorContainer
            className={cn(
              containerClassName,
              disable &&
              "pointer-events-none select-none cursor-default opacity-30",
            )}
          >
            <Editor className={cn(editorClassName)} variant={variant} />
          </EditorContainer>
        </Plate>
        {disable && (
          <motion.div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              disable && "visible",
            )}
            animate={{ rotate: 360 }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 1,
            }}
          >
            <LoaderCircle className="size-8" />
          </motion.div>
        )}
        <SaveTemplateDialog
          open={isTemplateDialogOpen}
          onOpenChange={setIsTemplateDialogOpen}
          currentEditor={internalRef.current}
          webEditor={webEditor}
          mobileEditor={mobileEditor}
          existingTemplate={existingTemplate}
          postId={fetchPostId}
          onTemplateSaved={(templateId) => {
            // 通知父組件更新 savedTemplateId
            onTemplateSelect?.(templateId);

            // 更新當前模板資訊
            if (templateId) {
              getTemplateById(templateId)
                .then((templateData) => {
                  if (templateData) {
                    setExistingTemplate({
                      id: templateData.id,
                      name: templateData.name,
                    });
                  }
                })
                .catch((error) => {
                  console.error("Failed to fetch updated template:", error);
                });
            }
          }}
        />
      </>
    );
  },
);

BlockEditor.displayName = "BlockEditor";

interface TemplateListProps {
  openMobileEditor?: boolean;
}

const TemplateList: React.FC<TemplateListProps> = ({ openMobileEditor }) => {
  const t = useTranslations("components.posts.edit.template");
  const editor = useEditorRef();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const templatesList = await getTemplatesList();
      setTemplates(templatesList);
    } catch (error) {
      console.error("獲取模板清單失敗:", error);
      toast.error(t("error.fetchTemplateFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleDeleteTemplate = async (
    templateId: string,
    templateName: string,
  ) => {
    try {
      await deleteTemplate(templateId);
      toast.success(t("error.deleteTemplateSuccess", { templateName }));
      // 重新獲取模板清單
      const templatesList = await getTemplatesList();
      setTemplates(templatesList);
    } catch (error) {
      console.error("刪除模板失敗:", error);
      toast.error(t("error.deleteTemplateFailed"));
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const applyTemplate = async (tpl: TemplateItem) => {
    try {
      const templateData = await getTemplateById(tpl.id);
      // 修正邏輯：web 模式載入 htmlContent，mobile 模式載入 mobileContent
      const rewriteEditor = openMobileEditor
        ? tpl.mobileContent
        : tpl.htmlContent;

      if (templateData && rewriteEditor) {
        editor.tf.focus();
        editor.tf.insertNodes(rewriteEditor, { select: true });
        toast.success(
          t("error.applyTemplateSuccess", { templateName: tpl.name }),
        );
      }
    } catch (error) {
      console.error("套用模板失敗:", error);
      toast.error(t("error.applyTemplateFailed"));
    }
  };

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (open) {
      fetchTemplates();
    }
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
      <SheetTrigger asChild>
        <ToolbarButton tooltip={t("openList")}>
          <FileCode2 className="size-4" />
        </ToolbarButton>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-0 flex h-full flex-col min-h-0"
      >
        <SheetHeader className="py-4 mb-2 border">
          <SheetTitle>{t("template")}</SheetTitle>
        </SheetHeader>
        <div className="px-5 min-h-0">
          <Input
            type="text"
            placeholder={t("searchTemplate")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="px-5 mt-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center text-muted-foreground">
              {t("loading")}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center text-muted-foreground">
              {t("noResultsFound")}
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredTemplates.map((template) => (
                <li
                  key={template.id}
                  className="p-3 rounded flex items-center justify-between cursor-pointer hover:bg-muted/30 border mr-2"
                >
                  <SheetClose asChild className="flex-1 text-left ">
                    <button
                      type="button"
                      aria-label={template.name}
                      onClick={() => {
                        applyTemplate(template);
                      }}
                    >
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </div>
                      )}
                    </button>
                  </SheetClose>
                  <button
                    type="button"
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                    aria-label={`delete: ${template.name}`}
                    onClick={() =>
                      handleDeleteTemplate(template.id, template.name)
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
