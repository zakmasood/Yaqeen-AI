import { describe, expect, it } from "vitest";
import { formatPkr } from "./format";

describe("formatPkr", () => {
  it("formats a PKR amount", () => {
    expect(formatPkr(5000)).toContain("5");
    expect(formatPkr(5000)).toMatch(/^PKR /);
  });
});
