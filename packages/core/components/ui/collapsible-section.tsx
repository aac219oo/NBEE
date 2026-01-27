"use client";

import {
  Collapsible,
  CollapsibleTrigger,
} from "@heiso/core/components/ui/collapsible";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@heiso/core/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  triggerClassName?: string;
}

export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
  className,
  triggerClassName,
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className={cn("space-y-4", className)}
    >
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex justify-end items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none w-full",
            triggerClassName,
          )}
        >
          <Icon
            icon="lucide:chevron-left"
            className={cn("size-4 transition-transform", open && "-rotate-90")}
          />
          <span>{title}</span>
        </div>
      </CollapsibleTrigger>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}
