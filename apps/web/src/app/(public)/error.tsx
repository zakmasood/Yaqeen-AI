"use client";

import { QueryMessage } from "@/components/ui/query-message";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-6 py-8">
      <QueryMessage title="This page could not be loaded">
        {error.message || "Try again in a moment."}
      </QueryMessage>
      <div className="mt-4 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
