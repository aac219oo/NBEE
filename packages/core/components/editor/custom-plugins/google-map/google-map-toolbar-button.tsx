"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@heiso/core/components/ui/alert-dialog";
import { Input } from "@heiso/core/components/ui/input";
import { MapIcon } from "lucide-react";
import { isUrl } from "platejs";
import { useEditorRef } from "platejs/react";
import * as React from "react";
import { toast } from "sonner";
import { ToolbarButton } from "@heiso/core/components/ui/toolbar";
import { KEY_MAP } from "../../plate-types";
import { resolveGoogleMapShortUrl } from "./google-map-actions";

export function GoogleMapToolbarButton() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      <ToolbarButton tooltip="Google Map" onClick={() => setDialogOpen(true)}>
        <MapIcon className="size-4" />
      </ToolbarButton>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="gap-6">
          <GoogleMapUrlDialogContent setOpen={setDialogOpen} />
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GoogleMapUrlDialogContent({
  setOpen,
}: {
  setOpen: (value: boolean) => void;
}) {
  const editor = useEditorRef();
  const [url, setUrl] = React.useState("");

  const embedMap = React.useCallback(async () => {
    let embed = url;

    if (url.includes("<iframe") && url.includes("src=")) {
      const match = url.match(/src="([^"]+)"/);
      if (match?.[1]) {
        embed = match[1];
      }
    }

    // Handle Google Maps short URLs
    if (embed.includes("maps.app.goo.gl") || embed.includes("goo.gl/maps")) {
      const resolved = await resolveGoogleMapShortUrl(embed);
      if (resolved) {
        embed = resolved;
      } else {
        toast.error("Could not resolve Google Maps short URL");
        return;
      }
    }

    if (!isUrl(embed)) return toast.error("Invalid URL");

    const lower = embed.toLowerCase();

    if (lower.includes("google.com/maps/place/")) {
      const placeMatch = embed.match(/google\.com\/maps\/place\/([^/]+)/);
      if (placeMatch?.[1]) {
        const placeName = decodeURIComponent(placeMatch[1]);
        embed = `https://www.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`;
      }
    } else if (
      lower.includes("google.com/maps") ||
      lower.includes("goo.gl/maps")
    ) {
      if (!(lower.includes("/embed") || lower.includes("output=embed"))) {
        const q = encodeURIComponent(embed);
        embed = `https://www.google.com/maps?q=${q}&output=embed`;
      }
    }

    setOpen(false);

    editor.tf.insertNodes({
      type: KEY_MAP,
      url: embed,
      children: [{ text: "" }],
    });
  }, [url, editor, setOpen]);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Insert Google Map</AlertDialogTitle>
      </AlertDialogHeader>

      <AlertDialogDescription className="group relative w-full">
        <label
          className="absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm text-muted-foreground/70 transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground"
          htmlFor="map-url"
        >
          <span className="inline-flex bg-background px-2">URL</span>
        </label>

        <Input
          id="map-url"
          className="h-10 w-full"
          placeholder=""
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              embedMap();
            }
          }}
        />
      </AlertDialogDescription>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault();
            embedMap();
          }}
        >
          Insert
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
