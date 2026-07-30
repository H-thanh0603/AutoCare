"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { InvoiceStatus } from "@/generated/prisma/enums";
import { cancelInvoiceAction, issueInvoiceAction, recordPaymentAction } from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";

interface Props {
  invoiceId: string;
  status: InvoiceStatus;
  balance: number;
  canInvoice: boolean;
  canPay: boolean;
}

/** Per-invoice controls on the invoices list: issue / cancel / record payment. */
export function InvoiceActions({ invoiceId, status, balance, canInvoice, canPay }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");

  function run(action: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMsg);
        setPaying(false);
        setAmount("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Có lỗi xảy ra.");
      }
    });
  }

  const canReceivePayment = balance > 0 && status !== "DRAFT" && status !== "CANCELLED" && status !== "REFUNDED";

  if (!canInvoice && !canPay) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
      {canInvoice && status === "DRAFT" ? (
        <>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(() => issueInvoiceAction(invoiceId), "Đã phát hành hóa đơn.")}
          >
            Phát hành
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              const reason = window.prompt("Lý do hủy hóa đơn?");
              if (reason && reason.trim()) {
                run(() => cancelInvoiceAction(invoiceId, reason.trim()), "Đã hủy hóa đơn.");
              }
            }}
          >
            Hủy
          </Button>
        </>
      ) : null}

      {canPay && canReceivePayment ? (
        paying ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`Tối đa ${balance}`}
              className="h-8 w-32 rounded-md border px-2 text-sm"
            />
            <Button
              size="sm"
              disabled={isPending || !amount || Number(amount) <= 0}
              onClick={() => run(() => recordPaymentAction(invoiceId, Number(amount)), "Đã ghi nhận thanh toán.")}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Xác nhận"}
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setPaying(false)}>
              Hủy
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setPaying(true)}>
            Ghi nhận thanh toán
          </Button>
        )
      ) : null}
    </div>
  );
}
