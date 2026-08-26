import { describe, expect, it } from "vitest";
import {
  AnalysisStatus,
  ANALYSIS_STATUSES,
  isAnalysisStatus,
  PAYMENT_SCREENING_DISCLAIMER,
} from "./index";

describe("AnalysisStatus", () => {
  it("includes the three operational outcomes", () => {
    expect(ANALYSIS_STATUSES).toEqual(["READY_FOR_CONFIRMATION", "MANUAL_REVIEW", "SUSPICIOUS"]);
  });

  it("validates known statuses and rejects others", () => {
    expect(isAnalysisStatus(AnalysisStatus.READY_FOR_CONFIRMATION)).toBe(true);
    expect(isAnalysisStatus(AnalysisStatus.MANUAL_REVIEW)).toBe(true);
    expect(isAnalysisStatus(AnalysisStatus.SUSPICIOUS)).toBe(true);
    expect(isAnalysisStatus("VERIFIED")).toBe(false);
    expect(isAnalysisStatus("91% authentic")).toBe(false);
    expect(isAnalysisStatus(null)).toBe(false);
  });

  it("exposes the non-verification disclaimer", () => {
    expect(PAYMENT_SCREENING_DISCLAIMER).toContain(
      "receipt of funds is not independently confirmed",
    );
  });
});
