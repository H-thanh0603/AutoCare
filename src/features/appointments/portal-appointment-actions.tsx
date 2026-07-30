"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  cancelPortalAppointmentAction,
  reschedulePortalAppointmentAction,
} from "@/features/appointments/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Customer-side cancel / reschedule controls. Kept as a client component so the
 * ActionResult from each server action is actually handled: errors surface in
 * an alert, a successful reschedule navigates to the NEW appointment (reschedule
 * cancels the old one and creates a new id), and a cancel refreshes in place.
 */
export function PortalAppointmentActions({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await reschedulePortalAppointmentAction(appointmentId, formData);
      if (result.ok) {
        toast.success("Đã đổi sang lịch hẹn mới.");
        router.push(`/tai-khoan/lich-hen/${result.data.id}`);
        return;
      }
      setError(result.message);
    });
  }

  function onCancel() {
    if (!window.confirm("Bạn chắc chắn muốn hủy lịch hẹn này? Thao tác không thể hoàn tác.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("reason", "Khách hủy lịch");
      const result = await cancelPortalAppointmentAction(appointmentId, formData);
      if (result.ok) {
        toast.success("Đã hủy lịch hẹn.");
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  return (
    <div className="grid gap-4 border-t pt-4">
      {error ? (
        <Alert variant="destructive" role="alert" className="bg-red-50 border-red-200 text-red-800 text-xs rounded-xl">
          <AlertCircle className="size-4 text-red-600" aria-hidden="true" />
          <AlertDescription className="font-semibold">{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={onReschedule} className="flex gap-2">
        <input
          className="h-9 min-w-0 flex-1 rounded-lg border border-input px-2"
          type="datetime-local"
          name="scheduledAt"
          required
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Đổi lịch"}
        </Button>
      </form>

      <Button type="button" variant="destructive" onClick={onCancel} disabled={isPending}>
        Hủy lịch
      </Button>
    </div>
  );
}
