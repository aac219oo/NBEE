"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@heiso/core/components/ui/dropdown-menu";
import { Copy, Eye, EyeOff, MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PostStatus } from "@heiso/core/components/primitives/posts/post-status";
import { DeletePostDialog } from "./delete-dialog";

interface PostActionsProps {
  post: {
    id: string;
    status: string;
    title: string;
  };
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => Promise<{ error?: string } | undefined>;
  onToggleStatus: (id: string, status: "hidden" | "draft") => Promise<void>;
  isPending: boolean;
  editLink: string;
}

export function PostActions({
  post,
  onDelete,
  onDuplicate,
  onToggleStatus,
  isPending: isGlobalPending,
}: PostActionsProps) {
  const t = useTranslations("components.posts.list");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [isDuplicatePending, startDuplicateTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    const toastId = toast.loading(
      t("copySuccess").replace("成功", "中...").replace("successfully", "..."),
    );
    startDuplicateTransition(async () => {
      try {
        const result = await onDuplicate(post.id);
        if (result && "error" in result && result.error) {
          toast.error(t("copyFailed"), { id: toastId });
        } else {
          toast.success(t("copySuccess"), { id: toastId });
        }
      } catch (_error) {
        toast.error(t("copyFailed"), { id: toastId });
      }
    });
  };

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = post.status === "hidden" ? "draft" : "hidden";
    const loadingText = t("updateSuccess").includes("成功")
      ? "更新中..."
      : "Updating...";
    const toastId = toast.loading(loadingText);

    startToggleTransition(async () => {
      try {
        await onToggleStatus(post.id, next);
        toast.success(t("updateSuccess"), { id: toastId });
      } catch (_error) {
        toast.error(t("updateFailed"), { id: toastId });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("label.actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleToggleStatus}
            disabled={isTogglePending}
            className="cursor-pointer"
          >
            {post.status === PostStatus.Hidden ? (
              <EyeOff className="mr-0.5 h-4 w-4" />
            ) : (
              <Eye className="mr-0.5 h-4 w-4" />
            )}
            {post.status === PostStatus.Hidden ? t("show") : t("hide")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDuplicate}
            disabled={isDuplicatePending}
            className="cursor-pointer"
          >
            <Copy className="mr-0.5 h-4 w-4" />
            {t("duplicate")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setOpenDeleteDialog(true);
            }}
            className="cursor-pointer"
          >
            <Trash2 className="mr-0.5 h-4 w-4" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeletePostDialog
        id={post.id}
        open={openDeleteDialog}
        onClose={setOpenDeleteDialog}
        onDelete={onDelete}
        isPending={isGlobalPending}
      />
    </>
  );
}
