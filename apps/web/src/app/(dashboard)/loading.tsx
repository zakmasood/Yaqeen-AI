import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-4 h-12 w-56" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="mt-8 h-8 w-40" />
      <Skeleton className="mt-4 h-56" />
    </div>
  );
}
