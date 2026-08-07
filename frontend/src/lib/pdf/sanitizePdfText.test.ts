import { sanitizePdfText } from "@/lib/pdf/sanitizePdfText";

describe("sanitizePdfText", () => {
  it("replaces arrows that break jsPDF Helvetica layout", () => {
    expect(sanitizePdfText("3.2  →  4.6")).toBe("3.2  ->  4.6");
  });

  it("normalizes dashes, ellipsis, and quotes", () => {
    expect(sanitizePdfText("You're ready — stretch… “now”")).toBe(
      "You're ready - stretch... \"now\"",
    );
  });

  it("strips remaining non-latin1 glyphs", () => {
    expect(sanitizePdfText("hello 🙂 world")).toBe("hello  world");
  });
});
