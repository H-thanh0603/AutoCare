import { presignRequestSchema } from "@/features/media/schema";
import { createUploadIntent } from "@/features/media/service";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertPayloadSize, sanitizePayload } from "@/lib/sanitizer";
import { requirePermission } from "@/lib/rbac";

export async function POST(request: Request): Promise<Response> {
  try {
    assertPayloadSize(request);
    const clientIp = getClientIp(request);
    assertRateLimit({ identifier: `media-presign:${clientIp}`, maxRequests: 20, windowMs: 60_000 });

    const rawJson = await request.json();
    const sanitized = sanitizePayload(rawJson);
    const parsed = presignRequestSchema.safeParse(sanitized);
    if (!parsed.success) {
      return Response.json({ message: "Dữ liệu upload không hợp lệ." }, { status: 400 });
    }

    const user = requirePermission(await getSessionUser(), "media:write");
    const result = await createUploadIntent(user, parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ message: error.message }, { status: error.httpStatus });
    }
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra.";
    return Response.json({ message }, { status: 400 });
  }
}
