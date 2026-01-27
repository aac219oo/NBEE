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
import { useTranslations } from "next-intl";
import { ActionButton } from "@heiso/core/components/primitives/action-button";

export function DeletePostDialog({
  id,
  open,
  onClose,
  onDelete,
  isPending,
}: {
  id: string;
  open: boolean;
  onClose: (open: boolean) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const t = useTranslations("components.posts.list");

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmDeletion")}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          {t("deleteConfirmMessage")}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <ActionButton
              disabled={isPending}
              loading={isPending}
              onClick={(e) => {
                e.preventDefault();
                onDelete(id);
              }}
            >
              {t("yes")}
            </ActionButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
