import { cva, type VariantProps } from "class-variance-authority";
import type { SlateElementProps } from "platejs";
import type * as React from "react";
import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import { cn } from "@heiso/core/lib/utils";

const headingVariants = cva("relative mb-1", {
  variants: {
    variant: {
      h1: "mt-[1.6em] pb-1 font-heading text-4xl font-bold",
      h2: "mt-[1.4em] pb-px font-heading text-2xl font-semibold tracking-tight",
      h3: "mt-[1em] pb-px font-heading text-xl font-semibold tracking-tight",
      h4: "mt-[0.75em] font-heading text-lg font-semibold tracking-tight",
      h5: "mt-[0.75em] text-lg font-semibold tracking-tight",
      h6: "mt-[0.75em] text-base font-semibold tracking-tight",
    },
  },
});

export function HeadingElementStatic({
  variant = "h1",
  ...props
}: SlateElementProps & VariantProps<typeof headingVariants>) {
  const styles = extractFrameStyles(props.element);
  const inlineClass =
    styles.display === "inline-block" ? "inline-block" : undefined;
  const Tag: React.ElementType = variant as unknown as React.ElementType;
  const headingAttributes =
    props.attributes as React.HTMLAttributes<HTMLElement>;
  return (
    <Tag
      {...headingAttributes}
      className={cn(headingVariants({ variant }), inlineClass)}
      style={{
        ...styles,
        textAlign: (props.element as any)?.align,
        lineHeight: (props.element as any)?.lineHeight,
      }}
    >
      {props.children}
    </Tag>
  );
}

export function H1ElementStatic(props: SlateElementProps) {
  return <HeadingElementStatic variant="h1" {...props} />;
}

export function H2ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>,
) {
  return <HeadingElementStatic variant="h2" {...props} />;
}

export function H3ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>,
) {
  return <HeadingElementStatic variant="h3" {...props} />;
}

export function H4ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>,
) {
  return <HeadingElementStatic variant="h4" {...props} />;
}

export function H5ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>,
) {
  return <HeadingElementStatic variant="h5" {...props} />;
}

export function H6ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>,
) {
  return <HeadingElementStatic variant="h6" {...props} />;
}
