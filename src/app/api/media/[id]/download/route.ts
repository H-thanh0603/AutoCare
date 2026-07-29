import { getSessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { createMediaDownloadUrl } from "@/features/media/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = requirePermission(await getSessionUser(), "media:read");
    const url = await createMediaDownloadUrl(user, (await params).id);
    return Response.redirect(url, 302);
  } catch {
    return Response.json({ message: "Không tìm thấy tệp." }, { status: 404 });
  }
}
