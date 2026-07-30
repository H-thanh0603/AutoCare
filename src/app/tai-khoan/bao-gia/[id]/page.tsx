import { ShieldCheck } from "lucide-react";
import { getPortalQuotation } from "@/data/portal";
import { requireUserPage } from "@/features/auth/guards";
import { QuotationItemDecision } from "@/features/quotations/quotation-item-decision";
import { formatVnd } from "@/lib/money";

export default async function PortalQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage("/tai-khoan");
  const quotation = await getPortalQuotation(user.id, (await params).id);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-4">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white uppercase tracking-wide">
              Xác Nhận Báo Giá Trực Tuyến
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">
              Báo Giá Xe {quotation.repairOrder.vehicle.licensePlate}
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Gara: <strong>{quotation.repairOrder.garage.name}</strong> • Mã lệnh: <span className="font-mono font-bold">{quotation.repairOrder.code}</span>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-right">
            <span className="text-xs text-blue-100 block font-semibold">Phiên bản Báo giá</span>
            <span className="text-lg font-black font-mono">Phiên bản #{quotation.versionNo}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-blue-100 pt-1 font-medium">
          <ShieldCheck className="size-4 text-emerald-300 shrink-0" />
          <span>Theo Quy tắc 1 & 5: Bạn có toàn quyền duyệt hoặc từ chối từng hạng mục trước khi Gara bắt đầu làm.</span>
        </div>
      </div>

      {/* Main Quotation Items Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">
          Chi Tiết Các Hạng Mục Báo Giá ({quotation.items.length})
        </h2>

        <div className="space-y-4">
          {quotation.items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-blue-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{item.description}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Số lượng: <strong className="text-slate-800 font-mono">{item.quantity}</strong> • Đơn giá: <span className="font-mono text-slate-700">{formatVnd(item.unitPrice)}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-base font-black text-blue-600 font-mono">
                    {formatVnd(item.totalAmount)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black border ${
                      item.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : item.status === "REJECTED"
                        ? "bg-red-100 text-red-800 border-red-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {item.status === "APPROVED" ? "✓ ĐÃ DUYỆT" : item.status === "REJECTED" ? "✗ TỪ CHỐI" : "⏳ CHỜ XÁC NHẬN"}
                  </span>
                </div>
              </div>

              {/* Action Buttons if item is PENDING and Quotation is SENT or PARTIALLY_APPROVED */}
              {(quotation.status === "SENT" || quotation.status === "PARTIALLY_APPROVED") && item.status === "PENDING" && (
                <QuotationItemDecision quotationItemId={item.id} />
              )}
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 font-bold block uppercase">Tổng cộng báo giá</span>
            <span className="text-xs text-slate-600">Đã bao gồm thuế & giảm giá (nếu có)</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-blue-600 font-mono">
              {formatVnd(quotation.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
