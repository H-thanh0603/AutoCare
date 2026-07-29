import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { completeUpload } from "@/features/media/service";

const schema = z.object({ uploadToken: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ message: "Dữ liệu upload không hợp lệ." }, { status: 400 });
  try {
    const user = requirePermission(await getSessionUser(), "media:write");
    return Response.json(await completeUpload(user, parsed.data.uploadToken));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra.";
    return Response.json({ message }, { status: 400 });
  }
}
