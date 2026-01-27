"use client";

import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import type * as React from "react";

import { cn } from "@heiso/core/lib/utils";

export function ParagraphElement(props: PlateElementProps) {
  const element = (props as any).element as
    | { children?: any[]; style?: React.CSSProperties }
    | undefined;
  const style = element?.style as React.CSSProperties | undefined;
  const _hasOnlyButtonAndEmptyTexts = Array.isArray(element?.children)
    ? element?.children?.every((c: any) => {
      const isLinkOrButton = c?.type === "link" || c?.type === "button";
      const txt =
        typeof c?.text === "string"
          ? c.text.replace(/\uFEFF/g, "").trim()
          : null;
      const isEmptyText = txt !== null && txt.length === 0;
      return isLinkOrButton || isEmptyText;
    })
    : false;
  return (
    <PlateElement {...props} style={style} className={cn("m-0 px-0 py-1")}>
      {props.children}
    </PlateElement>
  );
}
