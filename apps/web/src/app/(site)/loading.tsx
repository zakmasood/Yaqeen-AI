import { Skeleton } from "@/components/ui/skeleton";

export default function SiteLoading() {
  return (
    <div className="site-glow min-h-screen bg-canvas">
      <header className="border-b border-line/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
        <div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-6 h-16 w-full max-w-xl" />
          <Skeleton className="mt-3 h-16 w-4/5 max-w-lg" />
          <Skeleton className="mt-6 h-5 w-full max-w-md" />
          <Skeleton className="mt-8 h-11 w-28 rounded-full" />
        </div>
        <Skeleton className="h-80" />
      </div>
      <div className="border-y border-line py-4">
        <Skeleton className="mx-5 h-4" />
      </div>
    </div>
  );
}
