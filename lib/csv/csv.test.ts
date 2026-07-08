import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("passes plain values through", () => {
    expect(csvCell("The Hi-Tones")).toBe("The Hi-Tones");
    expect(csvCell(450)).toBe("450");
    expect(csvCell(null)).toBe("");
  });

  it("quotes values containing commas, quotes, and newlines", () => {
    expect(csvCell("Marlene & the Moonshiners, live")).toBe('"Marlene & the Moonshiners, live"');
    expect(csvCell('The "Hi" Tones')).toBe('"The ""Hi"" Tones"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("guards against spreadsheet formula injection", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvCell("+1234")).toBe("'+1234");
    expect(csvCell("-500")).toBe("'-500");
    expect(csvCell("@handle")).toBe("'@handle");
  });
});

describe("toCsv", () => {
  it("builds CRLF-terminated output with a header", () => {
    const csv = toCsv(["date", "act", "amount"], [["2026-08-01", "The Hi-Tones", 450]]);
    expect(csv).toBe("date,act,amount\r\n2026-08-01,The Hi-Tones,450\r\n");
  });
});
