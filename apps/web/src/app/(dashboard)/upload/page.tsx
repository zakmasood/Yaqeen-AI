import { NewAnalysisForm } from "@/features/upload/new-analysis-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewAnalysisPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <PageHeader
        kicker="New proof"
        title="Upload"
        lede="Upload a screenshot yourself, or send the customer a WhatsApp link for this order."
      />
      <NewAnalysisForm />
    </div>
  );
}
