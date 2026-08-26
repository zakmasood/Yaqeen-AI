import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/badge";
import { AnalysisStatus } from "@yaqeen/shared";

describe("StatusBadge smoke", () => {
  it("renders Ready for confirmation", () => {
    render(<StatusBadge status={AnalysisStatus.READY_FOR_CONFIRMATION} />);
    expect(screen.getByText("Ready for confirmation")).toBeInTheDocument();
  });

  it("renders Manual review and Suspicious", () => {
    const { rerender } = render(<StatusBadge status={AnalysisStatus.MANUAL_REVIEW} />);
    expect(screen.getByText("Manual review")).toBeInTheDocument();
    rerender(<StatusBadge status={AnalysisStatus.SUSPICIOUS} />);
    expect(screen.getByText("Suspicious")).toBeInTheDocument();
  });
});
