import { z } from "zod";

import { completeUpload } from "@/features/media/service";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertPayloadSize, sanitizePayload } from "@/lib/sanitizer";
import { requirePermission } from "@/lib/rbac";

const schema = z.object({ uploadToken: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  try {
    assertPayloadSize(request);
    const clientIp = getClientIp(request);
    assertRateLimit({ identifier: `media-complete:${clientIp}`, maxRequests: 20, windowMs: 60_000 });

    const rawJson = await request.json();
    const sanitized = sanitizePayload(rawJson);
    const parsed = schema.safeParse(sanitized);
    if (!parsed.success) {
      return Response.json({ message: "Dữ liệu upload không hợp lệ." }, { status: 400 });
    }

    const user = requirePermission(await getSessionUser(), "media:write");
    const result = await completeUpload(user, parsed.data.uploadToken);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ message: error.message }, { status: error.httpStatus });
    }
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra.";
    return Response.json({ message }, { status: 400 });
  }
}
