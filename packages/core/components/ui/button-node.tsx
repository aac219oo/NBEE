"use client";

import { buttonVariants } from "@heiso/core/components/ui/button";
import { getLinkAttributes } from "@platejs/link";
import type { VariantProps } from "class-variance-authority";
import type { TLinkElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import type { CSSProperties } from "react";
import { cn } from "@heiso/core/lib/utils";

export interface TButtonElement extends TLinkElement {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  align?: CSSProperties["textAlign"];
  style?: CSSProperties;
}

export function ButtonElement(props: PlateElementProps<TButtonElement>) {
  const { element } = props;
  const { variant = "default", size = "default" } = element;
  const attrs = getLinkAttributes(props.editor, props.element);

  return (
    <PlateElement
      {...props}
      as="a"
      className={cn(
        buttonVariants({ variant, size }),
        "h-auto block no-underline",
      )}
      attributes={{
        ...props.attributes,
        ...attrs,
        onMouseOver: (e) => e.stopPropagation(),
      }}
      style={{
        display: "block",
        height: "auto",
        textAlign: (element.style as any)?.textAlign ?? element.align,
        width: (element.style as any)?.width ?? ("fit-content" as any),
        ...(element.style || {}),
      }}
    >
      {props.children}
    </PlateElement>
  );
}
