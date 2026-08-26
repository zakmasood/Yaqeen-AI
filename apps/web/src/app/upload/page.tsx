import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { Card } from "@/components/ui/card";
import { PAYMENT_SCREENING_DISCLAIMER } from "@yaqeen/shared";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload payment proof</h1>
        <p className="mt-1 text-sm text-slate-600">
          Submit a screenshot for screening. Results are operational statuses only.
        </p>
      </div>
      <UploadDropzone />
      <Card>
        <p className="text-sm text-slate-600">{PAYMENT_SCREENING_DISCLAIMER}</p>
      </Card>
    </div>
  );
}
