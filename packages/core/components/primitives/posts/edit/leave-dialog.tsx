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
import { buttonVariants } from "@heiso/core/components/ui/button";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export function LeaveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("components.posts.edit");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <button
          type="button"
          className="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("leaveConfirm.title")}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          {t("leaveConfirm.description")}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              e.preventDefault();
              onOpenChange(false);
            }}
          >
            {t("leaveConfirm.stay")}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {t("leaveConfirm.leave")}
          </AlertDialogAction>
          <AlertDialogAction
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={(e) => {
              e.preventDefault();
              onSave();
              onConfirm();
            }}
          >
            {t("leaveConfirm.save")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
