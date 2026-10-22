import { describe, expect, it } from "vitest";
import { evidenceKindLabel } from "./analysis-map";

describe("evidenceKindLabel", () => {
  it("separates missing evidence from a contradiction", () => {
    expect(evidenceKindLabel("PAYEE_UNAVAILABLE")).toBe("Missing evidence");
    expect(evidenceKindLabel("NETWORK_CHECK_UNAVAILABLE")).toBe("Check availability");
    expect(evidenceKindLabel("PAYEE_MISMATCH")).toBe("Contradictory evidence");
    expect(evidenceKindLabel("NETWORK_REFERENCE_REUSED")).toBe("Seen at another merchant");
    expect(evidenceKindLabel("TXN_REUSED")).toBe("Duplicate match");
  });
});
