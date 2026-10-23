import { describe, expect, it } from "vitest";
import {
  customerProofMessage,
  inviteSubmitPath,
  inviteSubmitUrl,
  normalizeWhatsAppPhone,
  whatsappShareUrl,
} from "./customer-invite";

describe("invite submit URL", () => {
  it("is unique per token", () => {
    expect(inviteSubmitPath("abc_12")).toBe("/s/abc_12");
    expect(inviteSubmitUrl("http://localhost:3008", "abc_12")).toBe(
      "http://localhost:3008/s/abc_12",
    );
  });
});

describe("customerProofMessage", () => {
  it("includes the link, order, amount, and disclaimer", () => {
    const text = customerProofMessage({
      merchantName: "ManoVersa",
      submitUrl: "http://localhost:3008/s/abc_12",
      orderReference: "MV-1048",
      amountPkr: "5000",
    });
    expect(text).toContain("http://localhost:3008/s/abc_12");
    expect(text).toContain("Order MV-1048");
    expect(text).toContain("PKR 5000");
    expect(text).toContain("not confirmation that the money arrived");
    expect(text).toContain("ManoVersa");
  });
});

describe("normalizeWhatsAppPhone", () => {
  it("turns a local PK mobile into a wa.me number", () => {
    expect(normalizeWhatsAppPhone("0300 1234567")).toBe("923001234567");
    expect(normalizeWhatsAppPhone("+92 300 1234567")).toBe("923001234567");
  });
});

describe("whatsappShareUrl", () => {
  it("opens a blank compose when no phone is given", () => {
    expect(whatsappShareUrl("hello")).toBe("https://wa.me/?text=hello");
  });

  it("targets the customer when a phone is given", () => {
    expect(whatsappShareUrl("hello", "03001234567")).toBe("https://wa.me/923001234567?text=hello");
  });
});
