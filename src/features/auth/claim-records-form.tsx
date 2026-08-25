"use client";

/**
 * Two-step flow for linking existing garage customer records to the signed-in
 * account: request an OTP (sent to the email on file at the garage), then
 * enter it to claim the records.
 */

import { useState, useTransition } from "react";
import { Link2, Loader2, ShieldCheck } from "lucide-react";

import {
  confirmClaimOtpAction,
  requestClaimOtpAction,
} from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClaimRecordsForm() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const requestCode = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestClaimOtpAction(phone);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.data.message);
      setStep("code");
    });
  };

  const verifyCode = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmClaimOtpAction(phone, code);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStep("phone");
      setCode("");
      setMessage(
        result.data.linkedCustomerRecords > 0
          ? `Đã liên kết ${result.data.linkedCustomerRecords} hồ sơ. Tải lại trang để xem xe và lịch sử của bạn.`
          : "Xác thực thành công nhưng không còn hồ sơ nào để liên kết.",
      );
      if (result.data.linkedCustomerRecords > 0) {
        window.location.reload();
      }
    });
  };

  return (
    <section aria-labelledby="claim-records-heading" className="space-y-3">
      <h2 id="claim-records-heading" className="text-xl font-black text-slate-900 flex items-center gap-2">
        <Link2 className="size-5 text-slate-600" />
        <span>Liên Kết Hồ Sơ Có Sẵn</span>
      </h2>
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 max-w-xl">
        <p className="text-sm text-slate-600 font-medium">
          Bạn từng sửa xe tại gara đối tác trước khi tạo tài khoản? Nhập số điện
          thoại bạn đã cung cấp cho gara — chúng tôi sẽ gửi mã xác thực tới email
          lưu trên hồ sơ để liên kết lịch sử dịch vụ của bạn.
        </p>

        {message ? (
          <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-3 py-2">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold px-3 py-2">
            {error}
          </p>
        ) : null}

        {step === "phone" ? (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <Label className="flex-1 text-xs font-bold text-slate-700">
              Số điện thoại tại gara
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                inputMode="tel"
                className="mt-1"
              />
            </Label>
            <Button
              type="button"
              onClick={requestCode}
              disabled={isPending || phone.trim().length === 0}
              className="h-10 rounded-xl font-bold"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4 mr-1" />}
              Gửi mã xác thực
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <Label className="flex-1 text-xs font-bold text-slate-700">
              Mã xác thực (6 chữ số)
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-1 font-mono tracking-[0.4em]"
              />
            </Label>
            <Button
              type="button"
              onClick={verifyCode}
              disabled={isPending || code.length !== 6}
              className="h-10 rounded-xl font-bold"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4 mr-1" />}
              Xác nhận & liên kết
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              disabled={isPending}
              className="h-10 rounded-xl font-bold"
            >
              Quay lại
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
