"use client";

import { useRef, useState, type ChangeEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { IconClose, IconImage, IconTrash } from "@/components/icons";

type FileDropzoneProps = {
  variant?: "merchant" | "customer";
  onFileSelected?: (file: File | null) => void;
};

export function FileDropzone({ variant = "merchant", onFileSelected }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  function setSelected(next: File | null) {
    setFile(next);
    onFileSelected?.(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setSelected(next);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center",
          "border-yaqeen-200 bg-yaqeen-50/30 hover:bg-yaqeen-50",
        )}
      >
        <IconImage className="h-10 w-10 text-yaqeen-600" />
        {variant === "customer" ? (
          <>
            <p className="mt-3 text-sm font-semibold text-yaqeen-700">Choose screenshot</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG or WEBP · Max 10 MB</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold text-slate-800">Upload payment proof</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG or WEBP · Max 10 MB</p>
            <span className="mt-4 inline-flex rounded-lg border border-yaqeen-600 px-3 py-1.5 text-sm font-semibold text-yaqeen-700">
              Choose file
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={handleChange}
      />

      {file && variant === "customer" ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-yaqeen-700">
            <IconImage className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
            <p className="text-xs text-slate-500">{Math.max(1, Math.round(file.size / 1024))} KB</p>
          </div>
          <button
            type="button"
            aria-label="Remove file"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => setSelected(null)}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {file && variant === "merchant" ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-800">Attached file</p>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="h-12 w-10 overflow-hidden rounded bg-slate-100">
              <div className="flex h-full items-center justify-center text-yaqeen-700">
                <IconImage className="h-5 w-5" />
              </div>
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
              {file.name}
            </p>
            <Button
              variant="ghost"
              className="px-2 py-1 text-red-600 hover:text-red-700"
              onClick={() => setSelected(null)}
            >
              <IconTrash className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
