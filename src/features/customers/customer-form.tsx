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
  CUSTOMER_FORM_FIELDS,
  customerSchema,
  type CustomerFormValues,
} from "@/features/customers/schema";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/features/customers/actions";

interface CustomerFormProps {
  customerId?: string;
  defaultValues?: CustomerFormValues;
}

const EMPTY_VALUES: CustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  note: "",
};

export function CustomerForm({ customerId, defaultValues = EMPTY_VALUES }: CustomerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    defaultValues,
  });

  const isEditing = Boolean(customerId);

  function onSubmit(values: CustomerFormValues): void {
    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) {
      for (const [index, issue] of parsed.error.issues.entries()) {
        setError(
          issue.path[0] as keyof CustomerFormValues,
          { message: issue.message },
          { shouldFocus: index === 0 },
        );
      }
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      for (const field of CUSTOMER_FORM_FIELDS) {
        formData.set(field, values[field]);
      }

      if (customerId) {
        const result = await updateCustomerAction(customerId, formData);
        if (result.ok) {
          router.replace(`/khach-hang/${customerId}`);
          return;
        }
        applyActionErrors(result, setError);
        return;
      }

      const result = await createCustomerAction(formData);
      if (result.ok) {
        router.replace(`/khach-hang/${result.data.id}`);
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
        <Field htmlFor="name" label="Họ và tên" error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} {...register("name")} />
        </Field>
        <Field htmlFor="phone" label="Số điện thoại" error={errors.phone?.message}>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} {...register("phone")} />
        </Field>
        <Field htmlFor="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        </Field>
        <Field htmlFor="address" label="Địa chỉ" error={errors.address?.message}>
          <Input id="address" autoComplete="street-address" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "address-error" : undefined} {...register("address")} />
        </Field>
      </div>
      <Field htmlFor="note" label="Ghi chú" error={errors.note?.message}>
        <textarea id="note" rows={4} className="border-input focus-visible:ring-ring flex w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3" aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "note-error" : undefined} {...register("note")} />
      </Field>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo khách hàng"}
      </Button>
    </form>
  );
}

function applyActionErrors(
  result: { message: string; fieldErrors?: Record<string, string[]> },
  setError: UseFormSetError<CustomerFormValues>,
): void {
  let mapped = false;
  for (const field of CUSTOMER_FORM_FIELDS) {
    const messages = result.fieldErrors?.[field];
    if (messages?.length) {
      setError(field, { message: messages[0] }, { shouldFocus: !mapped });
      mapped = true;
    }
  }
  if (!mapped) setError("root", { message: result.message });
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
