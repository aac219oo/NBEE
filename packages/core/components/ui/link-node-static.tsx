import { buttonVariants } from "@heiso/core/components/ui/button";
import { getLinkAttributes } from "@platejs/link";
import type { VariantProps } from "class-variance-authority";
import * as Icons from "lucide-react";
import type { SlateElementProps, TLinkElement } from "platejs";
import type * as React from "react";
import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import { cn } from "@heiso/core/lib/utils";

type LinkStaticWithButton = TLinkElement & {
  asButton?: boolean;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  align?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
  image?: string;
  icon?: string;
  iconColor?: string;
  mediaPosition?: "left" | "right";
};

export function LinkElementStatic(
  props: SlateElementProps<LinkStaticWithButton>,
) {
  const attrs = getLinkAttributes(props.editor, props.element);
  const cls = cn(
    props.element?.asButton
      ? buttonVariants({
        variant: props.element?.variant || "default",
        size: props.element?.size || "default",
      })
      : "font-medium text-primary underline decoration-primary underline-offset-4",
    props.element?.asButton
      ? "h-auto w-fit no-underline transition-opacity hover:opacity-80"
      : undefined,
  );

  const base = extractFrameStyles(props.element as any) as any;
  const { marginTop, marginBottom, marginLeft, marginRight, ...rest } = base;

  if (!props.element?.asButton) {
    return (
      <a {...props.attributes} {...attrs} className={cls}>
        {props.children}
      </a>
    );
  }

  const { image, icon, iconColor, mediaPosition = "left" } = props.element;
  const Icon = icon ? (Icons as any)[icon] : null;
  const hasMedia = !!image || !!Icon;

  const mediaContent = (() => {
    if (image)
      return (
        <img
          src={image}
          alt=""
          style={{ height: "1.2em", width: "auto", objectFit: "contain" }}
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

  const restNoWidth = { ...rest } as any;
  delete restNoWidth.width;
  delete restNoWidth.display;
  const alignClass =
    marginLeft === "auto" && marginRight === "auto"
      ? "mx-auto"
      : marginLeft === "auto" && marginRight === "0"
        ? "ml-auto"
        : marginLeft === "0" && marginRight === "auto"
          ? "mr-auto"
          : undefined;
  const textAlignVal =
    rest.textAlign ??
    (rest.justifyContent === "center"
      ? "center"
      : rest.justifyContent === "flex-end"
        ? "right"
        : rest.justifyContent === "flex-start"
          ? "left"
          : undefined);

  const justifyContentVal =
    rest.justifyContent ??
    (textAlignVal === "center"
      ? "center"
      : textAlignVal === "right"
        ? "flex-end"
        : textAlignVal === "left"
          ? "flex-start"
          : undefined);

  return (
    <a
      {...props.attributes}
      {...attrs}
      className={alignClass ? cn(cls, alignClass) : cls}
      style={{
        display: hasMedia ? "flex" : "block",
        alignItems: "center",
        gap: "0.5rem",
        justifyContent: justifyContentVal,
        height: "auto",
        backgroundColor: rest.backgroundColor ?? "hsl(var(--primary))",
        color: rest.color ?? "hsl(var(--primary-foreground))",
        borderRadius: rest.borderRadius ?? "0.375rem",
        padding: rest.padding ?? undefined,
        paddingLeft: rest.paddingLeft ?? (rest.padding ? undefined : "1rem"),
        paddingRight: rest.paddingRight ?? (rest.padding ? undefined : "1rem"),
        paddingTop: rest.paddingTop ?? (rest.padding ? undefined : "0.5rem"),
        paddingBottom:
          rest.paddingBottom ?? (rest.padding ? undefined : "0.5rem"),
        textAlign: textAlignVal,
        width: rest.width ?? "fit-content",
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        ...restNoWidth,
      }}
    >
      {mediaPosition === "left" && mediaContent}
      {props.children}
      {mediaPosition === "right" && mediaContent}
    </a>
  );
}
