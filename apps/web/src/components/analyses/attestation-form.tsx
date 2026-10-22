"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { recordAttestation } from "@/lib/api";
import { ATTESTATION_OPTIONS } from "@/lib/analysis-map";

export function AttestationForm({
  analysisId,
  currentDecision,
}: {
  analysisId: string;
  currentDecision: string | null;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState(currentDecision ?? "PENDING_CONFIRMATION");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setPending(true);
    setError(null);
    try {
      await recordAttestation(analysisId, {
        decision,
        note: note.trim() || undefined,
      });
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save confirmation");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <SelectField
        label="Your confirmation"
        name="decision"
        value={decision}
        options={ATTESTATION_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onChange={(event) => setDecision(event.target.value)}
      />
      <TextField
        label="Note (optional)"
        name="note"
        value={note}
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
      />
      <Button onClick={onSave} disabled={pending}>
        {pending ? "Saving…" : "Save confirmation"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <p className="text-xs text-muted">
        This is your attestation. It does not mean the payment provider confirmed the transaction,
        and it does not change the screening result.
      </p>
    </div>
  );
}
