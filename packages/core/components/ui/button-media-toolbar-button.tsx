"use client";

import { Button } from "@heiso/core/components/ui/button";
import { Input } from "@heiso/core/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heiso/core/components/ui/popover";
import { ScrollArea } from "@heiso/core/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@heiso/core/components/ui/tabs";
import { useUploadEditorFile } from "@heiso/core/hooks/use-upload-editor-file";
import * as Icons from "lucide-react";
import {
  AlignLeft,
  AlignRight,
  ImageIcon,
  Loader2Icon,
  SearchIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { getPluginType, KEYS, type TLinkElement } from "platejs";
import { useEditorRef } from "platejs/react";
import * as React from "react";
import { toast } from "sonner";
import { useFilePicker } from "use-file-picker";
import { ToggleGroup, ToggleGroupItem } from "@heiso/core/components/ui/toggle-group";
import { ToolbarButton } from "@heiso/core/components/ui/toolbar";

export function ButtonMediaToolbarButton() {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState("image");

  // Icon Search State
  const [iconSearch, setIconSearch] = React.useState("");
  const [filteredIcons, setFilteredIcons] = React.useState<string[]>([]);

  // Local state for URL input to prevent focus loss
  const [urlInput, setUrlInput] = React.useState("");

  // Upload state
  const { uploadFile, uploadedFile, isUploading } = useUploadEditorFile();

  // Get current node values
  const linkNodeEntry = editor.api.node<TLinkElement>({
    at: editor.selection as any,
    match: { type: getPluginType(editor, KEYS.link) },
  });

  // Save selection path when opening popover to ensure we can update even if focus is lost
  const savedPath = React.useRef<any>(null);
  React.useEffect(() => {
    if (open && linkNodeEntry) {
      savedPath.current = linkNodeEntry[1];
    }
  }, [open, linkNodeEntry]);

  // Fallback to saved path if selection is lost (e.g. when typing in inputs)
  const effectiveEntry =
    linkNodeEntry ||
    (savedPath.current
      ? editor.api.node({
        at: savedPath.current,
        match: { type: getPluginType(editor, KEYS.link) },
      })
      : null);
  const linkNode = effectiveEntry ? effectiveEntry[0] : null;

  const currentImage = (linkNode as any)?.image;
  const currentIcon = (linkNode as any)?.icon;
  const mediaPosition = (linkNode as any)?.mediaPosition || "left";
  const iconColor = (linkNode as any)?.iconColor || "#000000";

  // Sync local URL state with node value when opening or node changes
  React.useEffect(() => {
    if (open && currentImage) {
      setUrlInput(currentImage);
    } else if (open && !currentImage) {
      setUrlInput("");
    }
  }, [open, currentImage]);

  const updateImage = (url: string | undefined) => {
    const at = linkNodeEntry ? linkNodeEntry[1] : savedPath.current;
    if (!at) return;

    editor.tf.setNodes(
      { image: url, icon: null, iconColor: null }, // Mutual exclusivity: clear icon
      { at },
    );
  };

  // Handle successful upload
  React.useEffect(() => {
    if (uploadedFile) {
      updateImage(uploadedFile.url);
    }
  }, [uploadedFile, updateImage]);

  // File Picker
  const { openFilePicker } = useFilePicker({
    accept: "image/*",
    multiple: false,
    onFilesSelected: (data: any) => {
      const file = data.plainFiles?.[0];
      if (file) {
        uploadFile(file).catch((err) => {
          toast.error(err.message);
        });
      }
    },
  });

  const updateIcon = (iconName: string | undefined) => {
    const at = linkNodeEntry ? linkNodeEntry[1] : savedPath.current;
    if (!at) return;

    editor.tf.setNodes(
      { icon: iconName, image: null }, // Mutual exclusivity: clear image
      { at },
    );
  };

  const updateIconColor = (color: string) => {
    const at = linkNodeEntry ? linkNodeEntry[1] : savedPath.current;
    if (!at) return;

    editor.tf.setNodes({ iconColor: color }, { at });
  };

  const updateMediaPosition = (pos: "left" | "right") => {
    const at = linkNodeEntry ? linkNodeEntry[1] : savedPath.current;
    if (!at) return;

    editor.tf.setNodes({ mediaPosition: pos }, { at });
  };

  const resetMedia = () => {
    const at = linkNodeEntry ? linkNodeEntry[1] : savedPath.current;
    if (!at) return;

    editor.tf.setNodes(
      { icon: null, image: null, mediaPosition: null, iconColor: null },
      { at },
    );
  };

  // Icon List Logic
  React.useEffect(() => {
    const allIcons = Object.keys(Icons).filter((key) => {
      return (
        key !== "icons" && key !== "createLucideIcon" && /^[A-Z]/.test(key)
      );
    });

    if (!iconSearch) {
      setFilteredIcons(allIcons.slice(0, 100));
    } else {
      const lowerSearch = iconSearch.toLowerCase();
      setFilteredIcons(
        allIcons
          .filter((name) => name.toLowerCase().includes(lowerSearch))
          .slice(0, 100),
      );
    }
  }, [iconSearch]);

  if (!linkNode) return null;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Button Media">
          <ImageIcon className="size-4" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="icon">Icon</TabsTrigger>
          </TabsList>

          <div className="my-2 flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Position</span>
            <ToggleGroup
              type="single"
              value={mediaPosition}
              onValueChange={(v) =>
                v && updateMediaPosition(v as "left" | "right")
              }
            >
              <ToggleGroupItem value="left" size="sm" aria-label="Left">
                <AlignLeft className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" size="sm" aria-label="Right">
                <AlignRight className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <TabsContent value="image" className="space-y-4 pt-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Image URL"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onBlur={() => updateImage(urlInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      updateImage(urlInput);
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={openFilePicker}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <UploadCloudIcon className="size-4" />
                  )}
                </Button>
              </div>

              {currentImage && (
                <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted/50">
                  <img
                    src={currentImage}
                    alt="Preview"
                    className="h-full w-full object-contain"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute right-1 top-1 size-6"
                    onClick={() => updateImage(undefined)}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="icon" className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <SearchIcon className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search icons..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="h-8"
              />
            </div>

            {currentIcon && (
              <div className="relative flex items-center justify-center rounded-md border bg-muted/50 p-4">
                {(() => {
                  const Icon = (Icons as any)[currentIcon];
                  return Icon ? (
                    <Icon
                      className="size-8"
                      style={{ color: iconColor || "currentColor" }}
                    />
                  ) : null;
                })()}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute right-1 top-1 size-6"
                  onClick={() => updateIcon(undefined)}
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">Icon Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={iconColor}
                  onChange={(e) => updateIconColor(e.target.value)}
                  className="h-6 w-12 cursor-pointer border-0 p-0"
                />
              </div>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-6 gap-2 p-1">
                {filteredIcons.map((name) => {
                  const Icon = (Icons as any)[name];
                  if (!Icon) return null;
                  return (
                    <Button
                      key={name}
                      variant={currentIcon === name ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateIcon(name)}
                      title={name}
                    >
                      <Icon className="size-4" />
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="mt-2 pt-2">
          <Button
            variant="outline"
            className="w-full text-xs text-muted-foreground hover:text-destructive"
            onClick={resetMedia}
          >
            Reset Media
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
