"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recordMileageAction,
  transferOwnershipAction,
} from "@/features/vehicles/actions";

interface VehicleHistoryFormsProps {
  vehicleId: string;
  owners: { id: string; name: string; phone: string }[];
}

export function VehicleHistoryForms({ vehicleId, owners }: VehicleHistoryFormsProps) {
  const router = useRouter();
  const [isMileagePending, startMileageTransition] = useTransition();
  const [isTransferPending, startTransferTransition] = useTransition();
  const [mileageError, setMileageError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [mileageFieldErrors, setMileageFieldErrors] = useState<Record<string, string[]>>({});
  const [transferFieldErrors, setTransferFieldErrors] = useState<Record<string, string[]>>({});

  function recordMileage(formData: FormData): void {
    setMileageError(null);
    setMileageFieldErrors({});
    startMileageTransition(async () => {
      const result = await recordMileageAction(vehicleId, formData);
      if (result.ok) {
        router.refresh();
        return;
      }
      setMileageFieldErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors || Object.keys(result.fieldErrors).length === 0) {
        setMileageError(result.message);
      }
    });
  }

  function transferOwnership(formData: FormData): void {
    setTransferError(null);
    setTransferFieldErrors({});
    startTransferTransition(async () => {
      const result = await transferOwnershipAction(vehicleId, formData);
      if (result.ok) {
        router.refresh();
        return;
      }
      setTransferFieldErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors || Object.keys(result.fieldErrors).length === 0) {
        setTransferError(result.message);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={recordMileage} className="space-y-3">
        <h2 className="font-semibold">Ghi số km</h2>
        <FieldError id="mileageKm" label="Số km" message={mileageFieldErrors.mileageKm?.[0]}><Input id="mileageKm" name="mileageKm" type="number" min="0" required aria-invalid={Boolean(mileageFieldErrors.mileageKm)} aria-describedby={mileageFieldErrors.mileageKm ? "mileageKm-error" : undefined} /></FieldError>
        <FieldError id="mileageNote" label="Ghi chú" message={mileageFieldErrors.note?.[0]}><Input id="mileageNote" name="note" aria-invalid={Boolean(mileageFieldErrors.note)} aria-describedby={mileageFieldErrors.note ? "mileageNote-error" : undefined} /></FieldError>
        <FieldError id="overrideReason" label="Lý do giảm km (chỉ quản lý)" message={mileageFieldErrors.overrideReason?.[0]}><Input id="overrideReason" name="overrideReason" aria-invalid={Boolean(mileageFieldErrors.overrideReason)} aria-describedby={mileageFieldErrors.overrideReason ? "overrideReason-error" : undefined} /></FieldError>
        {mileageError ? <p className="text-sm text-destructive" role="alert">{mileageError}</p> : null}
        <Button type="submit" disabled={isMileagePending}>{isMileagePending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}Ghi số km</Button>
      </form>
      <form action={transferOwnership} className="space-y-3 border-t pt-6 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
        <h2 className="font-semibold">Chuyển chủ sở hữu</h2>
        <FieldError id="customerId" label="Chủ sở hữu mới" message={transferFieldErrors.customerId?.[0]}><select id="customerId" name="customerId" required className="border-input focus-visible:ring-ring h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3" aria-invalid={Boolean(transferFieldErrors.customerId)} aria-describedby={transferFieldErrors.customerId ? "customerId-error" : undefined}><option value="">Chọn khách hàng</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} · {owner.phone}</option>)}</select></FieldError>
        <FieldError id="transferNote" label="Ghi chú" message={transferFieldErrors.note?.[0]}><Input id="transferNote" name="note" aria-invalid={Boolean(transferFieldErrors.note)} aria-describedby={transferFieldErrors.note ? "transferNote-error" : undefined} /></FieldError>
        {transferError ? <p className="text-sm text-destructive" role="alert">{transferError}</p> : null}
        <Button type="submit" variant="outline" disabled={isTransferPending}>{isTransferPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}Chuyển chủ</Button>
      </form>
    </div>
  );
}

function FieldError({
  id,
  label,
  message,
  children,
}: {
  id: string;
  label: string;
  message?: string;
  children: ReactNode;
}) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}{message ? <p id={`${id}-error`} className="text-sm text-destructive">{message}</p> : null}</div>;
}
