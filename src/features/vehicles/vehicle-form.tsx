"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createVehicleSchema,
  VEHICLE_FORM_FIELDS,
  vehicleSchema,
  type VehicleFormValues,
} from "@/features/vehicles/schema";
import {
  createVehicleAction,
  updateVehicleAction,
} from "@/features/vehicles/actions";

interface VehicleFormProps {
  owners: { id: string; name: string; phone: string }[];
  vehicleId?: string;
  defaultValues?: VehicleFormValues;
  initialOwnerId?: string;
  initialCurrentKm?: string;
}

const EMPTY_VALUES: VehicleFormValues = {
  licensePlate: "",
  vin: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  engineNumber: "",
};

export function VehicleForm({
  owners,
  vehicleId,
  defaultValues = EMPTY_VALUES,
  initialOwnerId = "",
  initialCurrentKm = "",
}: VehicleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(vehicleId);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VehicleFormValues & { customerId: string; currentKm: string }>({
    defaultValues: { ...defaultValues, customerId: initialOwnerId, currentKm: initialCurrentKm },
  });

  function onSubmit(values: VehicleFormValues & { customerId: string; currentKm: string }): void {
    const parsed = (isEditing ? vehicleSchema : createVehicleSchema).safeParse(values);
    if (!parsed.success) {
      for (const [index, issue] of parsed.error.issues.entries()) {
        setError(
          issue.path[0] as keyof VehicleFormState,
          { message: issue.message },
          { shouldFocus: index === 0 },
        );
      }
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      for (const field of VEHICLE_FORM_FIELDS) {
        formData.set(field, values[field]);
      }
      formData.set("customerId", values.customerId);
      formData.set("currentKm", values.currentKm);

      if (vehicleId) {
        const result = await updateVehicleAction(vehicleId, formData);
        if (result.ok) {
          router.replace(`/xe/${vehicleId}`);
          return;
        }
        applyActionErrors(result, setError);
        return;
      }

      const result = await createVehicleAction(formData);
      if (result.ok) {
        router.replace(`/xe/${result.data.id}`);
        return;
      }
      applyActionErrors(result, setError);
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {errors.root ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="licensePlate" label="Biển số" error={errors.licensePlate?.message}>
          <Input id="licensePlate" autoCapitalize="characters" aria-invalid={Boolean(errors.licensePlate)} aria-describedby={errors.licensePlate ? "licensePlate-error" : undefined} {...register("licensePlate")} />
        </Field>
        <Field htmlFor="vin" label="Số VIN / số khung" error={errors.vin?.message}>
          <Input id="vin" autoCapitalize="characters" aria-invalid={Boolean(errors.vin)} aria-describedby={errors.vin ? "vin-error" : undefined} {...register("vin")} />
        </Field>
        <Field htmlFor="brand" label="Hãng xe" error={errors.brand?.message}>
          <Input id="brand" aria-invalid={Boolean(errors.brand)} aria-describedby={errors.brand ? "brand-error" : undefined} {...register("brand")} />
        </Field>
        <Field htmlFor="model" label="Dòng xe" error={errors.model?.message}>
          <Input id="model" aria-invalid={Boolean(errors.model)} aria-describedby={errors.model ? "model-error" : undefined} {...register("model")} />
        </Field>
        <Field htmlFor="year" label="Năm sản xuất" error={errors.year?.message}>
          <Input id="year" type="number" inputMode="numeric" aria-invalid={Boolean(errors.year)} aria-describedby={errors.year ? "year-error" : undefined} {...register("year")} />
        </Field>
        <Field htmlFor="color" label="Màu xe" error={errors.color?.message}>
          <Input id="color" aria-invalid={Boolean(errors.color)} aria-describedby={errors.color ? "color-error" : undefined} {...register("color")} />
        </Field>
        <Field htmlFor="engineNumber" label="Số máy" error={errors.engineNumber?.message}>
          <Input id="engineNumber" aria-invalid={Boolean(errors.engineNumber)} aria-describedby={errors.engineNumber ? "engineNumber-error" : undefined} {...register("engineNumber")} />
        </Field>
        {!isEditing ? (
          <Field htmlFor="currentKm" label="Số km hiện tại" error={errors.currentKm?.message}>
            <Input id="currentKm" type="number" min="0" inputMode="numeric" aria-invalid={Boolean(errors.currentKm)} aria-describedby={errors.currentKm ? "currentKm-error" : undefined} {...register("currentKm")} />
          </Field>
        ) : null}
      </div>
      {!isEditing ? (
        <Field htmlFor="customerId" label="Chủ sở hữu" error={errors.customerId?.message}>
          <select id="customerId" className="border-input focus-visible:ring-ring h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3" aria-invalid={Boolean(errors.customerId)} aria-describedby={errors.customerId ? "customerId-error" : undefined} {...register("customerId")}>
            <option value="">Chọn khách hàng</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} · {owner.phone}</option>)}
          </select>
        </Field>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo xe"}
      </Button>
    </form>
  );
}

type VehicleFormState = VehicleFormValues & { customerId: string; currentKm: string };

function applyActionErrors(
  result: { message: string; fieldErrors?: Record<string, string[]> },
  setError: UseFormSetError<VehicleFormState>,
): void {
  for (const [index, [field, messages]] of Object.entries(result.fieldErrors ?? {}).entries()) {
    setError(
      field as keyof VehicleFormState,
      { message: messages[0] },
      { shouldFocus: index === 0 },
    );
  }
  if (!result.fieldErrors || Object.keys(result.fieldErrors).length === 0) {
    setError("root", { message: result.message });
  }
}

function Field({
  htmlFor,
  label,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p id={`${htmlFor}-error`} className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
