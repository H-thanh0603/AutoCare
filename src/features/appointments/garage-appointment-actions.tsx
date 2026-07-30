"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { AppointmentStatus } from "@/generated/prisma/enums";
import {
  cancelGarageAppointmentAction,
  confirmAppointmentAction,
  noShowAppointmentAction,
} from "@/features/appointments/actions";
import { Button } from "@/components/ui/button";

/**
 * Staff confirm / no-show / cancel controls. These are one-way transitions, so
 * destructive ones are guarded by a confirm dialog, and every outcome surfaces
 * via toast instead of silently reloading the page.
 */
export function GarageAppointmentActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: AppointmentStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(result.message ?? "Có lỗi xảy ra.");
      }
    });
  }

  if (status === "PENDING") {
    return (
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => run(() => confirmAppointmentAction(appointmentId), "Đã xác nhận lịch hẹn.")}
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
        Xác nhận
      </Button>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            if (window.confirm("Ghi nhận khách không đến (no-show)?")) {
              run(() => noShowAppointmentAction(appointmentId), "Đã ghi nhận no-show.");
            }
          }}
        >
          No-show
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            const reason = window.prompt("Lý do hủy lịch?", "Gara hủy lịch");
            if (reason && reason.trim()) {
              const formData = new FormData();
              formData.set("reason", reason.trim());
              run(() => cancelGarageAppointmentAction(appointmentId, formData), "Đã hủy lịch hẹn.");
            }
          }}
        >
          Hủy
        </Button>
      </>
    );
  }

  return null;
}
