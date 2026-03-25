import { Skeleton } from "@heiso/core/components/ui/skeleton";

export function LayoutSkeleton() {
  return (
    <div className="relative flex flex-col h-screen w-full bg-background">
      {/* Header */}
      <div className="h-12 border-b flex items-center px-4 gap-4">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-4 w-24" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      <div className="flex-1 flex h-full">
        {/* Sidebar */}
        <div className="w-[52px] border-r p-2 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
