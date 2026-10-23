import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-8 h-40" />
      <Skeleton className="mt-4 h-11 rounded-full" />
    </div>
  );
}
