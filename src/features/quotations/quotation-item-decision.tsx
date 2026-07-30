"use client";

import { useTransition } from "react";
import { Check, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { decideQuotationItemAction } from "@/features/quotations/actions";
import { Button } from "@/components/ui/button";

/**
 * Customer approve/reject controls for a single quotation item. Uses the
 * ActionResult-returning action so the outcome is shown (toast) and the page
 * refreshes to reflect the new item/quotation status, instead of silently
 * discarding the result like a bare form action.
 */
export function QuotationItemDecision({ quotationItemId }: { quotationItemId: string }) {
  const [isPending, startTransition] = useTransition();

  function decide(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await decideQuotationItemAction(quotationItemId, status);
      if (result.ok) {
        toast.success(status === "APPROVED" ? "Đã duyệt hạng mục." : "Đã từ chối hạng mục.");
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <div className="flex items-center justify-end gap-3 pt-1">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={() => decide("APPROVED")}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 px-5 shadow-md shadow-emerald-600/20"
      >
        {isPending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Check className="size-4 mr-1.5" />}
        <span>Đồng ý hạng mục này</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => decide("REJECTED")}
        className="border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl h-10 px-4"
      >
        <XCircle className="size-4 mr-1.5" />
        <span>Từ chối</span>
      </Button>
    </div>
  );
}
