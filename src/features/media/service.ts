import { createHmac, timingSafeEqual } from "crypto";

import { getRepairOrderDetail } from "@/data/repair-orders";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl, createUploadUrl, headMedia, readMediaPrefix } from "@/lib/s3";
import { detectMediaKind, mediaStorageKey, validateDeclaredMedia } from "@/features/media/schema";
import type { SessionUser } from "@/lib/rbac";

const TOKEN_TTL_MS = 5 * 60_000;

type UploadToken = { key: string; repairOrderId: string; userId: string; mimeType: string; sizeBytes: number; expiresAt: number };

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

function sign(payload: UploadToken): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verify(token: string, userId: string): UploadToken {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new ValidationError("Token upload không hợp lệ.");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ValidationError("Token upload không hợp lệ.");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UploadToken;
  if (payload.userId !== userId || payload.expiresAt < Date.now()) throw new ValidationError("Token upload đã hết hạn.");
  return payload;
}

export async function createUploadIntent(user: SessionUser, input: { repairOrderId: string; mimeType: string; sizeBytes: number }) {
  validateDeclaredMedia(input.mimeType, input.sizeBytes);
  const garageId = user.garageId;
  if (!garageId) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");
  await getRepairOrderDetail(garageId, input.repairOrderId);
  const key = mediaStorageKey(garageId, input.repairOrderId);
  const payload: UploadToken = { key, repairOrderId: input.repairOrderId, userId: user.id, mimeType: input.mimeType, sizeBytes: input.sizeBytes, expiresAt: Date.now() + TOKEN_TTL_MS };
  return { uploadUrl: await createUploadUrl(key, input.mimeType), uploadToken: sign(payload) };
}

export async function completeUpload(user: SessionUser, token: string): Promise<{ id: string }> {
  const payload = verify(token, user.id);
  const garageId = user.garageId;
  if (!garageId) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");
  await getRepairOrderDetail(garageId, payload.repairOrderId);
  const head = await headMedia(payload.key);
  if (head.ContentLength !== payload.sizeBytes || head.ContentType !== payload.mimeType) throw new ValidationError("Tệp tải lên không hợp lệ.");
  const kind = detectMediaKind(payload.mimeType, await readMediaPrefix(payload.key));
  const media = await prisma.$transaction(async (tx) => {
    const created = await tx.media.create({ data: { garageId, repairOrderId: payload.repairOrderId, kind, phase: "RECEPTION", storageKey: payload.key, mimeType: payload.mimeType, sizeBytes: payload.sizeBytes, uploadedById: user.id }, select: { id: true } });
    await recordAudit({ action: AUDIT_ACTIONS.MEDIA_UPLOADED, entityType: "Media", entityId: created.id, garageId, actorUserId: user.id, after: { repairOrderId: payload.repairOrderId, mimeType: payload.mimeType, sizeBytes: payload.sizeBytes } }, tx);
    return created;
  });
  return media;
}

export async function createMediaDownloadUrl(user: SessionUser, mediaId: string): Promise<string> {
  const media = await prisma.media.findFirst({
    where: {
      id: mediaId,
      repairOrder: user.role === "CUSTOMER"
        ? { customer: { userId: user.id, deletedAt: null }, vehicle: { ownerships: { some: { isCurrent: true, endedAt: null, customer: { userId: user.id, deletedAt: null } } } } }
        : { garageId: user.garageId ?? "" },
    },
    select: { storageKey: true },
  });
  if (!media) throw new NotFoundError("Không tìm thấy tệp.");
  return createDownloadUrl(media.storageKey);
}
