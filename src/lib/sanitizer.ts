import { PayloadTooLargeError } from "./errors";

/**
 * Strips HTML tags, script tags, event handlers, and javascript: protocols
 * to prevent XSS injection attacks.
 */
export function sanitizeString(value: string): string {
  if (typeof value !== "string") return value;

  // 1. Remove null characters
  let clean = value.replace(/\0/g, "");

  // 2. Remove script tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 3. Remove style, iframe, object, embed tags and contents
  clean = clean.replace(/<(style|iframe|object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "");

  // 4. Remove inline event handlers like onload=, onerror=, onclick=
  clean = clean.replace(/\s*on\w+\s*=\s*(["'])[\s\S]*?\1/gi, "");
  clean = clean.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, "");

  // 5. Remove javascript: pseudo-protocol in URLs
  clean = clean.replace(/javascript\s*:/gi, "");

  // 6. Strip HTML tags for plain text fields
  clean = clean.replace(/<[^>]*>/g, "");

  return clean.trim();
}

/**
 * Recursively sanitizes all string fields in an object or array payload.
 */
export function sanitizePayload<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return sanitizeString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as unknown as T;
  }

  if (typeof data === "object" && data !== null && !(data instanceof Date)) {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitizedObj[key] = sanitizePayload(value);
    }
    return sanitizedObj as T;
  }

  return data;
}

export const MAX_JSON_PAYLOAD_BYTES = 1_048_576; // 1 MB limit for standard JSON payloads
export const MAX_MEDIA_PAYLOAD_BYTES = 10_485_760; // 10 MB limit for file uploads

/**
 * Validates request payload size using Content-Length header.
 */
export function assertPayloadSize(request: Request, maxBytes = MAX_JSON_PAYLOAD_BYTES): void {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!Number.isNaN(bytes) && bytes > maxBytes) {
      throw new PayloadTooLargeError(`Dung lượng payload vượt quá giới hạn ${Math.round(maxBytes / (1024 * 1024))}MB.`);
    }
  }
}
