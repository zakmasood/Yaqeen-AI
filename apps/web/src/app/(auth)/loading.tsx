import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div>
      <Skeleton className="h-9 w-28" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-8 h-10" />
      <Skeleton className="mt-4 h-10" />
      <Skeleton className="mt-6 h-11 rounded-full" />
    </div>
  );
}
