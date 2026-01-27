import type {
  SlateElementProps,
  TCaptionElement,
  TResizableProps,
  TVideoElement,
} from "platejs";
import { NodeApi } from "platejs";
import {
  extractFrameStyles,
  generateYoutubeEmbedSrc,
  getYoutubeId,
  sanitizeUrl,
} from "@heiso/core/components/primitives/editor";

export function VideoElementStatic(
  props: SlateElementProps<TVideoElement & TCaptionElement & TResizableProps>,
) {
  const { align = "center", caption, url, width } = props.element;
  const styles = extractFrameStyles(props.element);
  const cleaned = sanitizeUrl(url);
  const ytId = getYoutubeId(cleaned);
  const embedSrc =
    generateYoutubeEmbedSrc(cleaned) ||
    (ytId ? `https://www.youtube.com/embed/${ytId}` : null);
  const _calculatedWidth = styles.width;

  return (
    <div {...props.attributes} className="py-2.5">
      <div style={{ textAlign: align }}>
        <figure
          style={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}
        >
          {embedSrc ? (
            <iframe
              title="YouTube video player"
              src={embedSrc}
              width="560"
              height="315"
              className="absolute top-0 left-0 w-full h-full rounded-[3px]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              frameBorder="0"
              allowFullScreen
            />
          ) : (
            <video
              className="w-full max-w-full rounded-sm object-cover px-0"
              src={cleaned}
              controls
            >
              <track kind="captions" />
            </video>
          )}
          {caption && <figcaption>{NodeApi.string(caption[0])}</figcaption>}
        </figure>
      </div>
      {props.children}
    </div>
  );
}
