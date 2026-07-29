import { describe, expect, it } from "vitest";

import { detectMediaKind, MAX_MEDIA_BYTES, validateDeclaredMedia } from "@/features/media/schema";
import { ValidationError } from "@/lib/errors";

describe("media validation", () => {
  it("accepts supported type and matching signature", () => {
    expect(() => validateDeclaredMedia("image/jpeg", MAX_MEDIA_BYTES)).not.toThrow();
    expect(detectMediaKind("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff]))).toBe("IMAGE");
    expect(detectMediaKind("application/pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("DOCUMENT");
  });

  it("rejects unsupported, oversized, and mismatched uploads", () => {
    expect(() => validateDeclaredMedia("image/gif", 100)).toThrow(ValidationError);
    expect(() => validateDeclaredMedia("image/png", MAX_MEDIA_BYTES + 1)).toThrow(ValidationError);
    expect(() => detectMediaKind("image/png", new Uint8Array([1, 2, 3, 4]))).toThrow(ValidationError);
  });
});
