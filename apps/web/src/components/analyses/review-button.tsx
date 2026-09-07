"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { markAnalysisReviewed } from "@/lib/api";

export function ReviewButton({
  analysisId,
  variant,
  alreadyReviewed,
}: {
  analysisId: string;
  variant: "primary" | "danger";
  alreadyReviewed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      await markAnalysisReviewed(analysisId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark reviewed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button variant={variant} onClick={onClick} disabled={pending || alreadyReviewed}>
        {alreadyReviewed ? "Reviewed" : pending ? "Saving…" : "Mark reviewed"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
