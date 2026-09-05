"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Link2, Loader2, Share2, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { createShareLinkAction, revokeShareLinkAction } from "@/features/vehicle-health/actions";
import { Button } from "@/components/ui/button";

interface ShareLink {
  id: string;
  token: string;
  expiresAt: Date | string | null;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

export function ShareLinkManager({
  vehicleId,
  links,
}: {
  vehicleId: string;
  links: ShareLink[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [durationDays, setDurationDays] = useState(30);

  function shareUrl(token: string): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/so-suc-khoe/chia-se/${token}`;
  }

  function onCreate() {
    startTransition(async () => {
      const result = await createShareLinkAction(vehicleId, durationDays);
      if (result.ok) {
        toast.success("Đã tạo liên kết chia sẻ.");
        router.refresh();
        return;
      }
      toast.error(result.message);
    });
  }

  function onRevoke(id: string) {
    if (!window.confirm("Thu hồi liên kết này? Người có link sẽ không xem được nữa.")) return;
    startTransition(async () => {
      const result = await revokeShareLinkAction(id);
      if (result.ok) {
        toast.success("Đã thu hồi liên kết.");
        router.refresh();
        return;
      }
      toast.error(result.message);
    });
  }

  async function onCopy(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success("Đã sao chép liên kết.");
    } catch {
      toast.error("Không sao chép được, hãy sao chép thủ công.");
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
      <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
        <Share2 className="size-5 text-blue-600" />
        <span>Chia Sẻ Sổ Sức Khỏe Xe</span>
      </h2>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-slate-700">
          Thời hạn hiệu lực
          <select
            value={durationDays}
            onChange={(event) => setDurationDays(Number(event.target.value))}
            className="mt-1 block h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
            disabled={isPending}
          >
            <option value={7}>7 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={90}>90 ngày</option>
            <option value={365}>1 năm</option>
          </select>
        </label>
        <Button type="button" onClick={onCreate} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
          ) : (
            <Link2 className="size-4 mr-1.5" aria-hidden="true" />
          )}
          Tạo liên kết mới
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Chưa có liên kết chia sẻ nào đang hoạt động.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-1.5" title="Quét để mở hồ sơ xe — in ra để dán lên xe/sổ bảo dưỡng">
                  <QRCodeSVG value={shareUrl(link.token)} size={84} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-slate-700">{shareUrl(link.token)}</p>
                  <p className="text-[11px] text-slate-400">
                    {link.expiresAt ? `Hết hạn: ${DATE_FORMATTER.format(new Date(link.expiresAt))}` : "Không hết hạn"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button type="button" size="sm" variant="outline" onClick={() => onCopy(link.token)}>
                  <Copy className="size-3.5 mr-1" /> Sao chép
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => onRevoke(link.id)} disabled={isPending}>
                  <Trash2 className="size-3.5 mr-1" /> Thu hồi
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
