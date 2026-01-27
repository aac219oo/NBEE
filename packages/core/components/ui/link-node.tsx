"use client";

import { buttonVariants } from "@heiso/core/components/ui/button";
import { getLinkAttributes } from "@platejs/link";
import type { VariantProps } from "class-variance-authority";
import * as Icons from "lucide-react";
import type { TLinkElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@heiso/core/lib/utils";

type LinkWithButton = TLinkElement & {
  asButton?: boolean;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  align?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
  icon?: string;
  image?: string;
  mediaPosition?: "left" | "right";
  iconColor?: string;
};

export function LinkElement(props: PlateElementProps<LinkWithButton>) {
  const {
    icon,
    image,
    asButton,
    mediaPosition = "left",
    iconColor,
  } = props.element;
  const Icon = icon && (Icons as any)[icon];

  // Mutually exclusive rendering: Image takes precedence if both exist (though we try to prevent this in data)
  // or we strictly follow "only one" rule.
  const MediaContent = () => {
    if (image) {
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
    }
    if (Icon) {
      return (
        <Icon
          className="w-[1em] h-[1em]"
          style={{ color: iconColor || "currentColor" }}
        />
      );
    }
    return null;
  };

  const textAlign =
    (props.element?.style as any)?.textAlign ?? props.element?.align;
  const justifyContent =
    textAlign === "right"
      ? "flex-end"
      : textAlign === "left"
        ? "flex-start"
        : "center";

  return (
    <PlateElement
      {...props}
      as="a"
      className={cn(
        asButton
          ? buttonVariants({
            variant: props.element?.variant || "default",
            size: props.element?.size || "default",
          })
          : "font-medium text-primary underline decoration-primary underline-offset-4",
        asButton ? "no-underline" : undefined,
      )}
      attributes={{
        ...props.attributes,
        ...getLinkAttributes(props.editor, props.element),
        onMouseOver: (e) => {
          e.stopPropagation();
        },
      }}
      style={
        asButton
          ? {
            height: "auto",
            textAlign: textAlign,
            width:
              (props.element?.style as any)?.width ?? ("fit-content" as any),
            ...(props.element?.style || {}),
            display: image || icon ? "flex" : "block",
            alignItems: "center",
            gap: "0.5rem",
            justifyContent: justifyContent,
          }
          : undefined
      }
    >
      {asButton ? (
        <>
          {mediaPosition === "left" && <MediaContent />}
          {props.children}
          {mediaPosition === "right" && <MediaContent />}
        </>
      ) : (
        <>
          {mediaPosition === "left" && <MediaContent />}
          {props.children}
          {mediaPosition === "right" && <MediaContent />}
        </>
      )}
    </PlateElement>
  );
}
