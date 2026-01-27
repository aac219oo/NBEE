import type { SlateElementProps } from "platejs";
import type { CSSProperties } from "react";
import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import { cn } from "@heiso/core/lib/utils";

export function CalloutElementStatic({
  children,
  className,
  ...props
}: SlateElementProps) {
  const styles = extractFrameStyles(props.element);
  const el = props.element as Partial<{
    align: CSSProperties["textAlign"];
    lineHeight: CSSProperties["lineHeight"];
    icon: string;
  }>;
  const inlineClass =
    styles.display === "inline-block" ? "inline-block" : undefined;
  return (
    <div
      {...props.attributes}
      className={cn(
        "my-1 flex rounded-sm bg-muted p-4 pl-3",
        inlineClass,
        className,
      )}
      style={{
        ...styles,
        textAlign: el.align,
        lineHeight: el.lineHeight,
      }}
    >
      <div className="size-6 text-[18px] select-none">
        <span
          style={{
            fontFamily:
              '"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", EmojiSymbols',
          }}
          data-plate-prevent-deserialization
        >
          {el.icon || "💡"}
        </span>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
