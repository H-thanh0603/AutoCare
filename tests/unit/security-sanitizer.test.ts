import { describe, expect, it } from "vitest";
import { PayloadTooLargeError, TooManyRequestsError } from "@/lib/errors";
import { assertRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { assertPayloadSize, sanitizePayload, sanitizeString } from "@/lib/sanitizer";

describe("Security & Input Sanitization", () => {
  it("strips malicious script tags and inline XSS event handlers", () => {
    const dirtyHtml = '<script>alert("XSS")</script><img src="x" onerror="alert(1)" />hello';
    const clean = sanitizeString(dirtyHtml);
    expect(clean).toBe("hello");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("onerror");
  });

  it("strips javascript: pseudo-protocols", () => {
    const dirtyUrl = "javascript:alert(document.cookie)";
    const clean = sanitizeString(dirtyUrl);
    expect(clean).not.toContain("javascript:");
  });

  it("recursively sanitizes string properties inside nested payload objects", () => {
    const dirtyPayload = {
      title: '  <script>evil()</script>Bảo dưỡng  ',
      nested: {
        note: '<iframe src="evil.com"></iframe>Ghi chú hợp lệ',
      },
      tags: ['<style>body{display:none}</style>tag1', "tag2"],
    };

    const clean = sanitizePayload(dirtyPayload);
    expect(clean.title).toBe("Bảo dưỡng");
    expect(clean.nested.note).toBe("Ghi chú hợp lệ");
    expect(clean.tags[0]).toBe("tag1");
  });

  it("enforces sliding window rate limits", () => {
    const identifier = `test-ip-${Date.now()}`;
    const options = { identifier, maxRequests: 2, windowMs: 1000 };

    expect(checkRateLimit(options).allowed).toBe(true);
    expect(checkRateLimit(options).allowed).toBe(true);
    expect(checkRateLimit(options).allowed).toBe(false);

    expect(() => assertRateLimit(options)).toThrow(TooManyRequestsError);
  });

  it("rejects payloads exceeding specified size limit", () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Length": "2097152" }, // 2 MB
    });

    expect(() => assertPayloadSize(req, 1_048_576)).toThrow(PayloadTooLargeError);
  });
});
