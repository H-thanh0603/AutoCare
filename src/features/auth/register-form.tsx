"use client";

/**
 * Customer registration form with bright, vibrant commercial theme.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/auth-schema";

import { registerAction } from "./actions";

const FIELDS = ["name", "email", "phone", "password", "confirmPassword"] as const;

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const formError = errors.root?.message;

  function onSubmit(values: RegisterInput) {
    startTransition(async () => {
      const formData = new FormData();
      for (const field of FIELDS) {
        formData.set(field, values[field]);
      }

      const result = await registerAction(formData);

      if (result.ok) {
        router.replace(result.data.redirectTo);
        return;
      }

      let mapped = false;
      for (const field of FIELDS) {
        const messages = result.fieldErrors?.[field];
        if (messages?.length) {
          setError(field, { message: messages[0] });
          mapped = true;
        }
      }
      if (!mapped) {
        setError("root", { message: result.message });
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError ? (
        <Alert variant="destructive" role="alert" className="bg-red-50 border-red-200 text-red-800 text-xs rounded-xl">
          <AlertCircle className="size-4 text-red-600" aria-hidden="true" />
          <AlertDescription className="font-semibold">{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-bold text-slate-700">Họ và tên</Label>
        <Input
          id="name"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-xl focus:bg-white focus:border-blue-600 h-11"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
        {errors.name ? (
          <p id="name-error" className="text-xs text-red-600 font-bold">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-slate-700">Địa chỉ Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          autoComplete="email"
          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-xl focus:bg-white focus:border-blue-600 h-11"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-xs text-red-600 font-bold">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Số điện thoại</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0912345678"
          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-xl focus:bg-white focus:border-blue-600 h-11"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
          {...register("phone")}
        />
        {errors.phone ? (
          <p id="phone-error" className="text-xs text-red-600 font-bold">
            {errors.phone.message}
          </p>
        ) : (
          <p id="phone-hint" className="text-[11px] text-slate-500">
            Số điện thoại dùng để nhận diện xe tại Gara.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-bold text-slate-700">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-xl focus:bg-white focus:border-blue-600 h-11"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-xs text-red-600 font-bold">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">Xác nhận mật khẩu</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-xl focus:bg-white focus:border-blue-600 h-11"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p id="confirmPassword-error" className="text-xs text-red-600 font-bold">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition-transform hover:scale-[1.02] mt-4"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
            Đang tạo tài khoản…
          </>
        ) : (
          "TẠO TÀI KHOẢN TẮC THÌ"
        )}
      </Button>
    </form>
  );
}
