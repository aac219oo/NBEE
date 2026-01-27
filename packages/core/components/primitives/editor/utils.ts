export const px = (v: any) => {
    if (v == null || v === "") return undefined;
    if (typeof v === "number") return `${v}px`;
    if (typeof v === "string") return v;
    return undefined;
};

// Clean up pasted URLs: trim spaces, strip quotes/backticks/angles, decode basic entities
export function sanitizeUrl(raw: string): string {
    try {
        if (typeof raw !== "string") return "";
        let s = String(raw).trim();
        s = s.replace(/^[\s`'"<>]+|[\s`'"<>]+$/g, "");
        s = s.trim();
        // decode a few common HTML entities
        s = s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
        return s;
    } catch {
        return raw as any;
    }
}

export const extractFrameStyles = (element: any): React.CSSProperties => {
    if (!element) return {};
    const s = (element as any).style || {};
    const style: Record<string, any> = {
        backgroundColor: s.backgroundColor ?? element.backgroundColor,
        borderTopWidth: px(s.borderTopWidth ?? element.borderTopWidth),
        borderRightWidth: px(s.borderRightWidth ?? element.borderRightWidth),
        borderBottomWidth: px(s.borderBottomWidth ?? element.borderBottomWidth),
        borderLeftWidth: px(s.borderLeftWidth ?? element.borderLeftWidth),
        borderStyle: s.borderStyle ?? element.borderStyle,
        borderColor: s.borderColor ?? element.borderColor,
        borderRadius: px(s.borderRadius ?? element.borderRadius),
        paddingTop: px(s.paddingTop ?? element.paddingTop),
        paddingRight: px(s.paddingRight ?? element.paddingRight),
        paddingBottom: px(s.paddingBottom ?? element.paddingBottom),
        paddingLeft: px(s.paddingLeft ?? element.paddingLeft),
        padding: px(s.padding ?? element.padding),
        marginTop: px(s.marginTop ?? element.marginTop),
        marginRight: px(s.marginRight ?? element.marginRight),
        marginBottom: px(s.marginBottom ?? element.marginBottom),
        marginLeft: px(s.marginLeft ?? element.marginLeft),
        display: s.display ?? element.display,
        justifyContent: s.justifyContent ?? element.justifyContent,
        textAlign: s.textAlign ?? element.textAlign,
        width: s.width ?? element.width,
        height: s.height ?? element.height,
    };
    const hasBorder =
        !!style.borderTopWidth ||
        !!style.borderRightWidth ||
        !!style.borderBottomWidth ||
        !!style.borderLeftWidth;
    if (hasBorder && !style.borderStyle) style.borderStyle = "solid";
    return Object.fromEntries(
        Object.entries(style).filter(([, v]) => v != null && v !== ""),
    );
};

// Extract YouTube video id from various URL formats
export function getYoutubeId(url: string) {
    try {
        const u = new URL(url);
        const host = u.hostname;
        const path = u.pathname.split("/").filter(Boolean);

        // youtu.be/<id>
        if (host.endsWith("youtu.be") && path.length >= 1) {
            return path[0];
        }

        // youtube.com or youtube-nocookie.com
        if (
            host.includes("youtube.com") ||
            host.includes("youtube-nocookie.com") ||
            host.includes("m.youtube.com")
        ) {
            // watch?v=<id>
            const v = u.searchParams.get("v");
            if (v) return v;

            // embed/<id>, shorts/<id>, live/<id>
            if (path.length >= 2 && ["embed", "shorts", "live"].includes(path[0])) {
                return path[1];
            }
        }
    } catch {
        // Fallback for non-URL strings
    }

    // Last resort: try to match a 11-char id in the string
    const match = url.match(/[a-zA-Z0-9_-]{11}/);
    return match?.[0] ?? null;
}

// Build a robust YouTube embed src, preserving useful params like list and start time.
export function generateYoutubeEmbedSrc(url: string): string | null {
    try {
        const u = new URL(url);
        const host = u.hostname;
        const path = u.pathname.split("/").filter(Boolean);

        // Playlist-only URLs: /playlist?list=ID
        if (
            (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) &&
            path[0] === "playlist"
        ) {
            const list = u.searchParams.get("list");
            if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
        }

        const ytId = getYoutubeId(url);
        if (!ytId) return null;

        // Preserve list
        const list = u.searchParams.get("list");

        // Preserve start time: support t=<Ns>, <MmSs>, <S>
        const t = u.searchParams.get("t");
        let start: number | undefined;
        if (t) {
            // Parse formats like 1h2m3s, 2m10s, 90s, 120
            const hMatch = t.match(/(\d+)h/);
            const mMatch = t.match(/(\d+)m/);
            const sMatch = t.match(/(\d+)s/);
            const plain = t.match(/^\d+$/);
            const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
            const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
            const secs = sMatch
                ? parseInt(sMatch[1], 10)
                : plain
                    ? parseInt(plain[0], 10)
                    : 0;
            const total = hours * 3600 + mins * 60 + secs;
            if (total > 0) start = total;
        }

        const params = new URLSearchParams();
        if (list) params.set("list", list);
        if (start != null) params.set("start", String(start));

        const qs = params.toString();
        return qs
            ? `https://www.youtube.com/embed/${ytId}?${qs}`
            : `https://www.youtube.com/embed/${ytId}`;
    } catch {
        return null;
    }
}
