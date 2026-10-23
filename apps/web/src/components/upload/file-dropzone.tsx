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
          "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-12 text-center",
          "border-line bg-lift hover:border-accent",
        )}
      >
        <IconImage className="h-10 w-10 text-accent" />
        {variant === "customer" ? (
          <>
            <p className="mt-3 text-sm font-semibold text-ink">Choose screenshot</p>
            <p className="mt-1 text-xs text-muted">PNG, JPG or WEBP · Max 10 MB</p>
          </>
        ) : (
          <>
            <p className="mt-3 font-display text-lg font-semibold text-ink">Upload payment proof</p>
            <p className="mt-1 text-xs text-muted">PNG, JPG or WEBP · Max 10 MB</p>
            <span className="mt-4 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-inset ring-line">
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
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-lift text-accent">
            <IconImage className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-muted">{Math.max(1, Math.round(file.size / 1024))} KB</p>
          </div>
          <button
            type="button"
            aria-label="Remove file"
            className="rounded-full p-1 text-muted hover:bg-lift hover:text-ink"
            onClick={() => setSelected(null)}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {file && variant === "merchant" ? (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Attached file</p>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
            <div className="h-12 w-10 overflow-hidden rounded bg-lift">
              <div className="flex h-full items-center justify-center text-accent">
                <IconImage className="h-5 w-5" />
              </div>
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{file.name}</p>
            <Button
              variant="ghost"
              className="px-2 py-1 text-danger hover:text-danger"
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
