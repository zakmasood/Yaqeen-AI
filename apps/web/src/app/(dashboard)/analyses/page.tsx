import { QueryMessage } from "@/components/ui/query-message";
import { AnalysisTable } from "@/components/analyses/analysis-table";
import { loadAnalyses } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import type { AnalysisResult } from "@yaqeen/shared";

export const dynamic = "force-dynamic";

export default async function AnalysesPage() {
  let rows: AnalysisResult[] = [];
  let error: string | null = null;
  try {
    rows = await loadAnalyses();
  } catch (err) {
    error = err instanceof ApiError ? err.message : "Could not load analyses";
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink">Inbox</h1>
      {error ? (
        <QueryMessage title="Analyses unavailable">{error}</QueryMessage>
      ) : rows.length === 0 ? (
        <QueryMessage title="No analyses yet">
          Upload a payment proof, or ask a customer to use the submit link.
        </QueryMessage>
      ) : (
        <AnalysisTable rows={rows} />
      )}
    </div>
  );
}
