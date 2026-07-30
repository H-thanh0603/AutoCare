"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createPortalAppointmentAction } from "@/features/appointments/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  vehicles: readonly { id: string; licensePlate: string }[];
}

export function AppointmentForm({ vehicles }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createPortalAppointmentAction(formData);
      if (result.ok) {
        toast.success("Đặt lịch hẹn thành công. Gara sẽ xác nhận sớm.");
        router.push(`/tai-khoan/lich-hen/${result.data.id}`);
        return;
      }
      setFormError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert variant="destructive" role="alert" className="bg-red-50 border-red-200 text-red-800 text-xs rounded-xl">
          <AlertCircle className="size-4 text-red-600" aria-hidden="true" />
          <AlertDescription className="font-semibold">{formError}</AlertDescription>
        </Alert>
      ) : null}

      <label className="block text-sm font-medium">
        Xe
        <select
          name="vehicleId"
          className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5"
          required
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.licensePlate}
            </option>
          ))}
        </select>
        {fieldError("vehicleId") ? (
          <span className="mt-1 block text-xs font-bold text-red-600">{fieldError("vehicleId")}</span>
        ) : null}
      </label>

      <label className="block text-sm font-medium">
        Thời gian hẹn
        <Input name="scheduledAt" type="datetime-local" required className="mt-1" />
        {fieldError("scheduledAt") ? (
          <span className="mt-1 block text-xs font-bold text-red-600">{fieldError("scheduledAt")}</span>
        ) : null}
      </label>

      <label className="block text-sm font-medium">
        Nhu cầu sửa chữa
        <Input name="serviceRequest" className="mt-1" maxLength={500} />
        {fieldError("serviceRequest") ? (
          <span className="mt-1 block text-xs font-bold text-red-600">{fieldError("serviceRequest")}</span>
        ) : null}
      </label>

      <label className="block text-sm font-medium">
        Ghi chú
        <Input name="note" className="mt-1" maxLength={1000} />
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
            Đang đặt lịch…
          </>
        ) : (
          "Đặt lịch"
        )}
      </Button>
    </form>
  );
}
