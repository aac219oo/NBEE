"use client";

import {
  createPlatePlugin,
  PlateElement,
  type PlateElementProps,
  useFocused,
  useSelected,
} from "platejs/react";
import React from "react";
import { KEY_MAP } from "@heiso/core/components/editor/plate-types";
import { sanitizeUrl } from "@heiso/core/components/primitives/editor/utils";

// Map 設置語言
const forceMapLanguage = (url: string, lang = "zh-TW") => {
  try {
    if (!url) return url;

    const urlObj = new URL(url);

    urlObj.searchParams.set("hl", lang);

    return urlObj.toString();
  } catch (_e) {
    return url;
  }
};

// Map 插入的 Element
export function MapElement({ ...props }: PlateElementProps) {
  const { children, element, editor } = props;
  const selected = useSelected();
  const focused = useFocused();

  const language =
    (editor.getOptions(KEY_MAP as any) as any)?.language || "zh-TW";

  const { align = "center", caption, url } = element;
  const cleaned = sanitizeUrl(url as string);

  const finalUrl = cleaned ? forceMapLanguage(cleaned, language) : "";

  const captionText = React.useMemo<string | null>(() => {
    if (Array.isArray(caption) && caption.length > 0) {
      const firstNode = caption[0];
      if (firstNode && typeof firstNode === "object" && "text" in firstNode) {
        return (firstNode as { text: string }).text;
      }
    }
    return null;
  }, [caption]);

  return (
    <PlateElement {...props}>
      <div
        contentEditable={false} // 重要：告訴編輯器這裡面不能打字
        className="relative my-4"
        style={{ textAlign: align as any }}
      >
        <figure
          className={`relative w-full h-[400px] rounded-md overflow-hidden bg-muted transition-all ${selected && focused ? "ring-2 ring-ring ring-offset-2" : ""
            }`}
        >
          {finalUrl ? (
            <iframe
              title="Google Map"
              src={finalUrl}
              width="100%"
              height="100%"
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ pointerEvents: selected ? "none" : "auto" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              Map URL is empty
            </div>
          )}
          {captionText && <figcaption>{captionText}</figcaption>}
        </figure>
      </div>
      {children}
    </PlateElement>
  );
}

// Map 靜態渲染 Element (用於 HTML 轉換)
export function MapElementStatic({ element, children, attributes }: any) {
  const { align = "center", caption, url } = element;
  const language = "zh-TW";

  const cleaned = sanitizeUrl(url as string);
  const finalUrl = cleaned ? forceMapLanguage(cleaned, language) : "";

  const captionText = React.useMemo<string | null>(() => {
    if (Array.isArray(caption) && caption.length > 0) {
      const firstNode = caption[0];
      if (firstNode && typeof firstNode === "object" && "text" in firstNode) {
        return (firstNode as { text: string }).text;
      }
    }
    return null;
  }, [caption]);

  return (
    <div
      {...attributes}
      className="relative my-4"
      style={{ textAlign: align as any }}
    >
      <figure className="relative w-full h-[400px] rounded-md overflow-hidden bg-muted transition-all">
        {finalUrl ? (
          <iframe
            title="Google Map"
            src={finalUrl}
            width="100%"
            height="100%"
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            Map URL is empty
          </div>
        )}
        {captionText && <figcaption>{captionText}</figcaption>}
      </figure>
      {children}
    </div>
  );
}

// Map 建立插件
export const mapPlugin = createPlatePlugin({
  key: KEY_MAP,
  options: {
    language: "zh-TW",
  },
  node: {
    isElement: true,
    isVoid: true,
    component: MapElement,
  },
});
