import type { SlateElementProps } from "platejs";
import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import { cn } from "@heiso/core/lib/utils";

export function BlockquoteElementStatic(props: SlateElementProps) {
  const styles = extractFrameStyles(props.element);
  const inlineClass =
    styles.display === "inline-block" ? "inline-block" : undefined;
  return (
    <blockquote
      {...props.attributes}
      className={cn("my-1 border-l-2 pl-6 italic", inlineClass)}
      style={{
        ...styles,
        textAlign: (props.element as any)?.align,
        lineHeight: (props.element as any)?.lineHeight,
      }}
    >
      {props.children}
    </blockquote>
  );
}
