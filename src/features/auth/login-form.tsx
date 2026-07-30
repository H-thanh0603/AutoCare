"use client";

/**
 * Login form with bright, vibrant commercial theme & quick demo account selection.
 *
 * Zod validates on the client for fast feedback, but the server action
 * re-validates and is the authority — see `features/auth/actions.ts`.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, KeyRound, Loader2, Sparkles } from "lucide-react";

import { loginAction } from "@/features/auth/actions";
import { credentialsSchema, type CredentialsInput } from "@/lib/auth-schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { role: "👔 Quản lý Gara", email: "quanly@garathanhdat.vn" },
  { role: "📋 Lễ tân", email: "letan@garathanhdat.vn" },
  { role: "🔧 Kỹ thuật viên", email: "kythuat1@garathanhdat.vn" },
  { role: "💳 Thu ngân", email: "thungan@garathanhdat.vn" },
  { role: "🏎️ Khách hàng", email: "khach1@gmail.com" },
] as const;

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CredentialsInput>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const selectDemoAccount = (email: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", "AutoCare@2026", { shouldValidate: true });
    setFormError(null);
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);
      if (next) formData.set("next", next);

      const result = await loginAction(formData);

      if (result.ok) {
        router.replace(result.data.redirectTo);
        return;
      }

      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (field === "email" || field === "password") {
            setError(field, { message: messages[0] });
          }
        }
      }
      setFormError(result.message);
    });
  });

  return (
    <Card className="w-full border-slate-200 bg-white text-slate-900 shadow-2xl rounded-3xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-black text-slate-900 flex items-center justify-between">
          <span>Đăng nhập hệ thống</span>
          <KeyRound className="size-5 text-blue-600" />
        </CardTitle>
        <CardDescription className="text-slate-500 text-xs font-medium">
          Nhập thông tin tài khoản nhân sự gara hoặc tài khoản khách hàng.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Demo Account Buttons */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900">
            <Sparkles className="size-4 text-amber-500 fill-amber-400" />
            <span>Chọn nhanh tài khoản Demo (Mật khẩu: AutoCare@2026)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => selectDemoAccount(acc.email)}
                className="text-left text-[11px] font-bold px-3 py-2 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-slate-800 transition-all shadow-sm truncate hover:scale-105"
                title={`Đăng nhập bằng ${acc.email}`}
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {formError ? (
            <Alert variant="destructive" role="alert" className="bg-red-50 border-red-200 text-red-800 text-xs rounded-xl">
              <AlertCircle className="size-4 text-red-600" aria-hidden="true" />
              <AlertDescription className="font-semibold">{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs font-bold text-slate-700">
              Địa chỉ Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nhap-email@example.com"
              autoComplete="email"
              autoFocus
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

          <div className="grid gap-2">
            <Label htmlFor="password" className="text-xs font-bold text-slate-700">
              Mật khẩu
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
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

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition-transform hover:scale-[1.02]"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
                Đang đăng nhập…
              </>
            ) : (
              "ĐĂNG NHẬP NGAY"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
