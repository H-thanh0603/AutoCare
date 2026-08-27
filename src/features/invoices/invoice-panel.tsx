"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard, Download, FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import type { InvoiceStatus } from "@/generated/prisma/enums";
import {
  cancelInvoiceAction,
  createInvoiceAction,
  issueInvoiceAction,
  recordPaymentAction,
} from "@/features/invoices/actions";
import { invoiceStatusLabel } from "@/features/repair-orders/labels";
import { formatVnd } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InvoiceView {
  id: string;
  code: string;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount: number;
}

interface Props {
  repairOrderId: string;
  invoices: InvoiceView[];
  canInvoice: boolean;
  canPay: boolean;
}

export function InvoicePanel({ repairOrderId, invoices, canInvoice, canPay }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  function run(action: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMsg);
        setPayingId(null);
        setAmount("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Có lỗi xảy ra.");
      }
    });
  }

  async function handleVnpay(invoiceId: string) {
    try {
      const res = await fetch("/api/payment/vnpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (data.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.error(data.message ?? "Không tạo được link thanh toán VNPay.");
      }
    } catch {
      toast.error("Lỗi kết nối đến server.");
    }
  }

  return (
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Chưa có hóa đơn cho lệnh sửa chữa này.</p>
      ) : (
        <ul className="space-y-3">
          {invoices.map((invoice) => {
            const balance = invoice.totalAmount - invoice.paidAmount;
            return (
              <li key={invoice.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-sm">{invoice.code}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{invoiceStatusLabel(invoice.status)}</Badge>
                    {invoice.status !== "DRAFT" && (
                      <a
                        href={`/api/pdf/invoice/${invoice.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="size-3" />
                        PDF
                      </a>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>Tổng: <strong>{formatVnd(invoice.totalAmount)}</strong></span>
                  <span>Đã trả: <strong>{formatVnd(invoice.paidAmount)}</strong></span>
                  <span>Còn lại: <strong>{formatVnd(balance)}</strong></span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canInvoice && invoice.status === "DRAFT" ? (
                    <>
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => run(() => issueInvoiceAction(invoice.id), "Đã phát hành hóa đơn.")}
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
                            run(() => cancelInvoiceAction(invoice.id, reason.trim()), "Đã hủy hóa đơn.");
                          }
                        }}
                      >
                        Hủy
                      </Button>
                    </>
                  ) : null}

                  {canPay &&
                  balance > 0 &&
                  invoice.status !== "DRAFT" &&
                  invoice.status !== "CANCELLED" &&
                  invoice.status !== "REFUNDED" ? (
                    payingId === invoice.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={balance}
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder={`Tối đa ${balance}`}
                          className="h-7 w-32 rounded-md border px-2 text-sm"
                        />
                        <Button
                          size="sm"
                          disabled={isPending || !amount || Number(amount) <= 0}
                          onClick={() => run(() => recordPaymentAction(invoice.id, Number(amount)), "Đã ghi nhận thanh toán.")}
                        >
                          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Xác nhận"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setPayingId(null)}>
                          Hủy
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => setPayingId(invoice.id)}>
                        Ghi nhận thanh toán
                      </Button>
                    )
                  ) : null}

                  {canPay &&
                  balance > 0 &&
                  invoice.status !== "DRAFT" &&
                  invoice.status !== "CANCELLED" &&
                  invoice.status !== "REFUNDED" ? (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={isPending}
                      onClick={() => handleVnpay(invoice.id)}
                    >
                      <CreditCard className="size-3.5 mr-1" />
                      VNPay
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canInvoice ? (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => createInvoiceAction(repairOrderId), "Đã tạo hóa đơn nháp.")}
        >
          {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4 mr-1.5" />}
          Tạo hóa đơn từ lệnh sửa chữa
        </Button>
      ) : null}
    </div>
  );
}
