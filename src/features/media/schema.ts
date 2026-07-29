import { randomUUID } from "crypto";

import { z } from "zod";

import { ValidationError } from "@/lib/errors";

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export const presignRequestSchema = z.object({
  repairOrderId: z.string().min(1),
  inspectionItemId: z.string().min(1).optional(),
  mimeType: z.string(),
  sizeBytes: z.coerce.number().int().positive(),
});

export function validateDeclaredMedia(mimeType: string, sizeBytes: number): void {
  if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
    throw new ValidationError("Chỉ nhận JPEG, PNG, WEBP hoặc PDF.");
  }
  if (sizeBytes > MAX_MEDIA_BYTES) {
    throw new ValidationError("Tệp tải lên không được vượt quá 10 MB.");
  }
}

export function mediaStorageKey(garageId: string, repairOrderId: string): string {
  return `garages/${garageId}/repair-orders/${repairOrderId}/${randomUUID()}`;
}

export function detectMediaKind(mimeType: string, bytes: Uint8Array): "IMAGE" | "DOCUMENT" {
  const signatures: Record<string, readonly number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
    "application/pdf": [0x25, 0x50, 0x44, 0x46],
  };
  const signature = signatures[mimeType];
  if (!signature || signature.some((value, index) => bytes[index] !== value)) {
    throw new ValidationError("Nội dung tệp không khớp định dạng đã khai báo.");
  }
  return mimeType === "application/pdf" ? "DOCUMENT" : "IMAGE";
}
