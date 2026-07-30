"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, PackageCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { RepairOrderStatus } from "@/generated/prisma/enums";
import {
  deliverVehicleAction,
  failQualityCheckAction,
  passQualityCheckAction,
} from "@/features/repair-orders/actions";
import { Button } from "@/components/ui/button";

interface Props {
  repairOrderId: string;
  status: RepairOrderStatus;
  canQualityCheck: boolean;
  canDeliver: boolean;
}

/**
 * Stage-transition controls for the tail of the repair-order workflow:
 * quality-check pass/fail (QUALITY_CHECK) and vehicle delivery
 * (READY_FOR_DELIVERY). Only the buttons valid for the current status render.
 */
export function RepairOrderStageActions({ repairOrderId, status, canQualityCheck, canDeliver }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState("");

  function run(action: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMsg);
        setFailing(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Có lỗi xảy ra.");
      }
    });
  }

  if (status === "QUALITY_CHECK" && canQualityCheck) {
    return (
      <div className="space-y-3">
        {failing ? (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Lý do nghiệm thu không đạt (bắt buộc)"
              className="min-h-16 w-full rounded-md border p-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending || reason.trim().length === 0}
                onClick={() => run(() => failQualityCheckAction(repairOrderId, reason), "Đã trả về sửa lại.")}
              >
                Xác nhận không đạt
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => setFailing(false)}>
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => run(() => passQualityCheckAction(repairOrderId), "Nghiệm thu đạt, sẵn sàng giao xe.")}
            >
              {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
              Nghiệm thu đạt
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setFailing(true)}>
              <XCircle className="size-4 mr-1.5" />
              Không đạt
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (status === "READY_FOR_DELIVERY" && canDeliver) {
    return (
      <Button
        disabled={isPending}
        onClick={() => run(() => deliverVehicleAction(repairOrderId), "Đã bàn giao xe cho khách.")}
      >
        {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <PackageCheck className="size-4 mr-1.5" />}
        Bàn giao xe
      </Button>
    );
  }

  return null;
}
