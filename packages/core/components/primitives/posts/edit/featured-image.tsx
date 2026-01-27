"use client";

import { cn } from "@udecode/cn";
import { Plus } from "lucide-react";
// import { useState } from 'react';
import { ImageUploader } from "@heiso/core/components/primitives/uploader";

export function FeaturedImage({
  value,
  onChange,
  icon,
  buttonClassName,
  disabled,
}: {
  value?: string;
  onChange?: (url: string) => void;
  icon?: React.ReactNode;
  buttonClassName?: string;
  disabled?: boolean;
}) {
  return (
    <div className="border-dashed rounded-lg space-y-2">
      <ImageUploader
        value={value}
        onUploadComplete={(file) => {
          console.log(file);
          onChange?.(file.url);
        }}
        className="hover:outline-2 hover:outline-primary rounded-lg"
        buttonClassName={cn(buttonClassName)}
        disabled={disabled}
      >
        <div
          className={cn("flex items-center justify-center", buttonClassName)}
        >
          {icon ?? <Plus />}
        </div>
      </ImageUploader>
    </div>
  );
}
