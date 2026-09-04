import { describe, expect, it } from "vitest";
import {
  customerProofMessage,
  customerSubmitPath,
  customerSubmitUrl,
  normalizeWhatsAppPhone,
  whatsappShareUrl,
} from "./customer-invite";

describe("customer submit URL", () => {
  it("scopes the path by merchant slug", () => {
    expect(customerSubmitPath("manoversa")).toBe("/submit?merchant=manoversa");
    expect(customerSubmitUrl("http://localhost:3008", "manoversa")).toBe(
      "http://localhost:3008/submit?merchant=manoversa",
    );
  });
});

describe("customerProofMessage", () => {
  it("includes the link, order, amount, and disclaimer", () => {
    const text = customerProofMessage({
      merchantName: "ManoVersa",
      submitUrl: "http://localhost:3008/submit?merchant=manoversa",
      orderReference: "MV-1048",
      amountPkr: "5000",
    });
    expect(text).toContain("http://localhost:3008/submit?merchant=manoversa");
    expect(text).toContain("Order MV-1048");
    expect(text).toContain("PKR 5000");
    expect(text).toContain("not confirmation of funds");
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
