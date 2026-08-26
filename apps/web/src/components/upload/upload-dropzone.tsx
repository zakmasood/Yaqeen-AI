"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type UploadDropzoneProps = {
  onFileSelected?: (file: File) => void;
};

/** UI shell only — does not upload or run analysis in the scaffold. */
export function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileSelected?.(file);
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm font-medium text-slate-800">Drop a payment screenshot here</p>
      <p className="mt-1 text-xs text-slate-500">
        Easypaisa, JazzCash, Raast, or bank transfer. PNG/JPG. Screening only — not fund
        confirmation.
      </p>
      <label className="mt-4 inline-block cursor-pointer">
        <span className="sr-only">Choose file</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-yaqeen-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-yaqeen-700"
          onChange={handleChange}
        />
      </label>
      {fileName ? <p className="mt-3 text-sm text-yaqeen-700">Selected: {fileName}</p> : null}
      <div className="mt-4">
        <Button type="button" disabled>
          Submit for screening (coming soon)
        </Button>
      </div>
    </div>
  );
}
