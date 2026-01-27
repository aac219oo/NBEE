import type { SlateElementProps } from "platejs";
import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import { cn } from "@heiso/core/lib/utils";

export function ParagraphElementStatic(props: SlateElementProps) {
  const styles = extractFrameStyles(props.element);
  const inlineClass =
    styles.display === "inline-block" ? "inline-block" : undefined;
  return (
    <p
      {...props.attributes}
      className={cn("m-0 px-0 py-1", inlineClass)}
      style={{
        ...styles,
        textAlign: (props.element as any)?.align,
        lineHeight: (props.element as any)?.lineHeight,
      }}
    >
      {props.children}
    </p>
  );
}
