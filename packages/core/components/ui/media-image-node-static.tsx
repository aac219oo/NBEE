import type {
  SlateElementProps,
  TCaptionProps,
  TImageElement,
  TResizableProps,
} from "platejs";
import { NodeApi } from "platejs";

import { extractFrameStyles } from "@heiso/core/components/primitives/editor";
import { cn } from "@heiso/core/lib/utils";

export function ImageElementStatic(
  props: SlateElementProps<TImageElement & TCaptionProps & TResizableProps>,
) {
  const { align = "center", caption, url, width } = props.element;
  const styles = extractFrameStyles(props.element);
  const linkUrl = (props.element as unknown as { linkUrl?: string }).linkUrl;

  return (
    <div {...props.attributes} className="py-2.5">
      <figure
        className="group relative m-0 inline-block"
        style={{ ...styles, width: styles.width ?? width }}
      >
        <div
          className="relative max-w-full min-w-[92px]"
          style={{ textAlign: align }}
        >
          {linkUrl ? (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              <img
                className={cn(
                  "block h-auto max-w-full cursor-pointer object-contain px-0",
                  "rounded-sm",
                )}
                alt=""
                src={url}
              />
            </a>
          ) : (
            <img
              className={cn(
                "block h-auto max-w-full cursor-pointer object-contain px-0",
                "rounded-sm",
              )}
              alt=""
              src={url}
            />
          )}
          {caption && (
            <figcaption className="mx-auto mt-2 h-[24px] max-w-full">
              {NodeApi.string(caption[0])}
            </figcaption>
          )}
        </div>
      </figure>
      {props.children}
    </div>
  );
}
