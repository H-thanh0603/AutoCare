"use client";

/**
 * Login form with quick demo account selection.
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

export function LoginForm() {
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
    <Card className="w-full border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
          <span>Đăng nhập</span>
          <KeyRound className="size-5 text-blue-400" />
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          Dành cho nhân viên gara và khách hàng theo dõi xe.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Demo Account Buttons */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Sparkles className="size-3.5" />
            <span>Chọn nhanh tài khoản Demo (Mật khẩu: AutoCare@2026)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => selectDemoAccount(acc.email)}
                className="text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600/30 hover:border-blue-500/50 border border-slate-800 text-slate-200 transition-colors truncate"
                title={`Đăng nhập bằng ${acc.email}`}
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {formError ? (
            <Alert variant="destructive" role="alert" className="bg-red-950/50 border-red-500/30 text-red-200 text-xs">
              <AlertCircle className="size-4 text-red-400" aria-hidden="true" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nhap-email@example.com"
              autoComplete="email"
              autoFocus
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl focus:border-blue-500"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p id="email-error" className="text-xs text-red-400 font-medium">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
              Mật khẩu
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl focus:border-blue-500"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password ? (
              <p id="password-error" className="text-xs text-red-400 font-medium">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02]"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
                Đang đăng nhập…
              </>
            ) : (
              "Đăng nhập hệ thống"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
