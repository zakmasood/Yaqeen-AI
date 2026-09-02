import { NewAnalysisForm } from "@/features/upload/new-analysis-form";

export default function NewAnalysisPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">New analysis</h1>
      <NewAnalysisForm />
    </div>
  );
}
