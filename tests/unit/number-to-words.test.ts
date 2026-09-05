import { describe, expect, it } from "vitest";

import { numberToVietnameseWords } from "@/lib/pdf/number-to-words";

describe("numberToVietnameseWords", () => {
  it("handles zero", () => {
    expect(numberToVietnameseWords(0)).toBe("Không đồng chẵn");
  });

  it("handles single digits", () => {
    expect(numberToVietnameseWords(1)).toBe("Một đồng chẵn");
    expect(numberToVietnameseWords(5)).toBe("Năm đồng chẵn");
  });

  it("handles teens with mười/lăm rule", () => {
    expect(numberToVietnameseWords(10)).toBe("Mười đồng chẵn");
    expect(numberToVietnameseWords(11)).toBe("Mười một đồng chẵn");
    expect(numberToVietnameseWords(15)).toBe("Mười lăm đồng chẵn");
  });

  it("handles tens with mốt/tư/lăm rule", () => {
    expect(numberToVietnameseWords(21)).toBe("Hai mươi mốt đồng chẵn");
    expect(numberToVietnameseWords(24)).toBe("Hai mươi tư đồng chẵn");
    expect(numberToVietnameseWords(25)).toBe("Hai mươi lăm đồng chẵn");
    expect(numberToVietnameseWords(20)).toBe("Hai mươi đồng chẵn");
  });

  it("handles hundreds with lẻ connector", () => {
    expect(numberToVietnameseWords(101)).toBe("Một trăm lẻ một đồng chẵn");
    expect(numberToVietnameseWords(105)).toBe("Một trăm lẻ năm đồng chẵn");
    expect(numberToVietnameseWords(115)).toBe("Một trăm mười lăm đồng chẵn");
    expect(numberToVietnameseWords(100)).toBe("Một trăm đồng chẵn");
  });

  it("handles thousands and millions", () => {
    expect(numberToVietnameseWords(1000)).toBe("Một nghìn đồng chẵn");
    expect(numberToVietnameseWords(1_015_000)).toBe(
      "Một triệu không trăm mười lăm nghìn đồng chẵn",
    );
    expect(numberToVietnameseWords(1_000_005)).toBe("Một triệu lẻ năm đồng chẵn");
    expect(numberToVietnameseWords(3_800_000)).toBe(
      "Ba triệu tám trăm nghìn đồng chẵn",
    );
  });

  it("does not emit bare scale words for zero groups", () => {
    expect(numberToVietnameseWords(1_000_005)).not.toContain("nghìn");
    expect(numberToVietnameseWords(1_000_000)).toBe("Một triệu đồng chẵn");
  });

  it("handles billions (tỷ)", () => {
    expect(numberToVietnameseWords(1_000_000_000)).toBe("Một tỷ đồng chẵn");
    expect(numberToVietnameseWords(2_500_000_000)).toBe(
      "Hai tỷ năm trăm triệu đồng chẵn",
    );
  });

  it("handles negative amounts", () => {
    expect(numberToVietnameseWords(-15)).toBe("Âm mười lăm đồng chẵn");
  });
});
