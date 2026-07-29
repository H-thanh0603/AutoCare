import { getSessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { presignRequestSchema } from "@/features/media/schema";
import { createUploadIntent } from "@/features/media/service";

export async function POST(request: Request): Promise<Response> {
  const parsed = presignRequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ message: "Dữ liệu upload không hợp lệ." }, { status: 400 });
  try {
    const user = requirePermission(await getSessionUser(), "media:write");
    return Response.json(await createUploadIntent(user, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra.";
    return Response.json({ message }, { status: 400 });
  }
}
