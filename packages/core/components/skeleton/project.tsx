import { Skeleton } from "@heiso/core/components/ui/skeleton";

export function ProjectSkeleton() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
