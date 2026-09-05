/**
 * Converts a VND amount to Vietnamese words.
 * Used for the mandatory "tổng số tiền bằng chữ" field on VAT invoices.
 *
 * Follows standard Vietnamese reading rules:
 * - 1 after "mươi" -> "mốt" (hai mươi mốt), after "mười"/"lẻ" -> "một"
 * - 4 after "mươi" -> "tư" (hai mươi tư)
 * - 5 after "mươi"/"mười" -> "lăm" (mười lăm), after "lẻ"/standalone -> "năm"
 * - 0 in tens with non-zero ones after hundreds -> "lẻ" (một trăm lẻ năm)
 * - non-leading groups below 100 get "không trăm"/"lẻ" prefix
 *   (một triệu không trăm mười lăm nghìn, một triệu lẻ năm)
 *
 * @example numberToVietnameseWords(3_800_000) // "Ba triệu tám trăm nghìn đồng chẵn"
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

/** Word for `ones` when it stands alone or right after "lẻ". */
function onesStandalone(ones: number): string {
  return DIGITS[ones];
}

/**
 * Read the tens+ones part (value 0..99) assuming hundreds context is handled
 * by the caller. `afterHundreds` indicates the group has hundreds > 0, so a
 * zero-ten needs the "lẻ" connector.
 */
function readTensOnes(tens: number, ones: number, afterHundreds: boolean): string {
  if (tens === 0) {
    if (ones === 0) return "";
    return afterHundreds ? `lẻ ${onesStandalone(ones)}` : onesStandalone(ones);
  }
  if (tens === 1) {
    if (ones === 0) return "mười";
    // 11..19: mười một ... mười lăm (not "mười năm")
    return ones === 5 ? "mười lăm" : `mười ${onesStandalone(ones)}`;
  }
  // tens >= 2
  const tenWord = `${DIGITS[tens]} mươi`;
  if (ones === 0) return tenWord;
  if (ones === 1) return `${tenWord} mốt`;
  if (ones === 4) return `${tenWord} tư`;
  if (ones === 5) return `${tenWord} lăm`;
  return `${tenWord} ${onesStandalone(ones)}`;
}

/**
 * Read a 0..999 chunk as if standalone (most-significant group).
 * Returns "" for 0.
 */
function readChunkStandalone(chunk: number): string {
  const hundreds = Math.floor(chunk / 100);
  const tens = Math.floor(chunk / 10) % 10;
  const ones = chunk % 10;
  if (chunk === 0) return "";
  if (hundreds > 0) {
    const head = `${DIGITS[hundreds]} trăm`;
    const tail = readTensOnes(tens, ones, true);
    return tail ? `${head} ${tail}` : head;
  }
  return readTensOnes(tens, ones, false);
}

/**
 * Read a 1..999 chunk that is NOT the most significant group.
 * Adds the "không trăm"/"lẻ" prefix so "1.015.000" reads
 * "một triệu không trăm mười lăm nghìn" instead of "một triệu mười lăm nghìn".
 */
function readChunkNonLeading(chunk: number): string {
  const hundreds = Math.floor(chunk / 100);
  if (hundreds > 0) return readChunkStandalone(chunk);
  const tens = Math.floor(chunk / 10) % 10;
  const ones = chunk % 10;
  if (tens === 0) return `lẻ ${onesStandalone(ones)}`;
  return `không trăm ${readTensOnes(tens, ones, false)}`;
}

// Scale names up to ~10^17 (VND fits safely in Number up to 9e15).
const SCALES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ", "tỷ tỷ"];

export function numberToVietnameseWords(amount: number): string {
  if (!Number.isFinite(amount)) throw new Error("Amount must be a finite number");
  if (amount === 0) return "Không đồng chẵn";
  if (amount < 0) {
    const positive = numberToVietnameseWords(-amount);
    return "Âm " + positive.charAt(0).toLowerCase() + positive.slice(1);
  }

  let remaining = Math.floor(amount);
  const chunks: number[] = [];
  while (remaining > 0) {
    chunks.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk === 0) continue; // skip empty groups entirely
    const isLeading = parts.length === 0;
    const words = isLeading ? readChunkStandalone(chunk) : readChunkNonLeading(chunk);
    const scaleIndex = i;
    const scale = SCALES[scaleIndex] ?? "";
    parts.push(scale ? `${words} ${scale}` : words);
  }

  const result = `${parts.join(" ").replace(/\s+/g, " ").trim()} đồng chẵn`;
  return result.charAt(0).toUpperCase() + result.slice(1);
}
