"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@heiso/core/components/ui/dialog";
import { Input } from "@heiso/core/components/ui/input";
import { Label } from "@heiso/core/components/ui/label";
import { cn } from "@udecode/cn";
import { Plus } from "lucide-react";
import { useState } from "react";

interface FeaturedVideoProps {
  value?: string;
  onChange?: (url: string) => void;
  icon?: React.ReactNode;
  buttonClassName?: string;
}

export function FeaturedVideo({
  value,
  onChange,
  icon,
  buttonClassName,
}: FeaturedVideoProps) {
  const [videoUrl, setVideoUrl] = useState(value || "");
  const [tempUrl, setTempUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const getYoutubeEmbedUrl = (url: string) => {
    try {
      const videoId = url.split("v=")[1].split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } catch {
      return "";
    }
  };

  const handleSave = () => {
    setVideoUrl(tempUrl);
    onChange?.(tempUrl);
    setIsOpen(false);
  };

  return (
    <div className="space-y-4 rounded-lg hover:outline-2 hover:outline-primary">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {videoUrl || (
            <Button variant="outline" className={cn("w-12", buttonClassName)}>
              {icon ?? <Plus />}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Featured Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
              />
            </div>
            {tempUrl && (
              <div className="aspect-video">
                <iframe
                  src={getYoutubeEmbedUrl(tempUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  title="Featured Video Preview"
                />
              </div>
            )}
            <Button onClick={handleSave} className="w-full">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {videoUrl && (
        <div className={cn("aspect-video relative group ", buttonClassName)}>
          <iframe
            src={getYoutubeEmbedUrl(videoUrl)}
            className="w-full h-full"
            allowFullScreen
            title="Featured Video"
            style={{ borderRadius: "12px" }}
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto rounded-lg">
            <Button
              variant="secondary"
              size="sm"
              className="pointer-events-auto"
              onClick={() => {
                setTempUrl(videoUrl);
                setIsOpen(true);
              }}
            >
              Change
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="pointer-events-auto"
              onClick={() => {
                setVideoUrl("");
                onChange?.("");
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
