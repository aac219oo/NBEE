"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { cn } from "@heiso/core/lib/utils";

interface LoadingOverlayProps {
  show: boolean;
  className?: string;
}

export function LoadingOverlay({ show, className }: LoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("components.posts.edit");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (show) {
      toast.loading(t("uploading"), {
        id: "upload-toast",
      });
    } else {
      toast.dismiss("upload-toast");
    }
  }, [show, t]);

  if (!show || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-9999 bg-white/0 cursor-wait select-none",
        className,
      )}
    />,
    document.body,
  );
}
