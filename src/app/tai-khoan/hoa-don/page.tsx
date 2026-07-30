import type { Metadata } from "next";
import { Banknote, Receipt } from "lucide-react";

import { listPortalInvoices } from "@/data/portal";
import { requireUserPage } from "@/features/auth/guards";
import { invoiceStatusLabel } from "@/features/repair-orders/labels";
import { formatVnd } from "@/lib/money";

export const metadata: Metadata = {
  title: "Hóa đơn của tôi · AutoCare.vn",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function PortalInvoicesPage() {
  const user = await requireUserPage("/tai-khoan/hoa-don");
  const invoices = await listPortalInvoices(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Banknote className="size-6 text-emerald-600" />
          <span>Hóa Đơn Của Tôi</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Theo dõi hóa đơn, số tiền đã thanh toán và công nợ còn lại tại các Gara.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-sm shadow-sm space-y-2">
          <Receipt className="size-10 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-800">Chưa có hóa đơn nào</p>
          <p className="text-xs">Hóa đơn sẽ xuất hiện sau khi Gara lập cho lệnh sửa chữa của bạn.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
            return (
              <div key={invoice.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-slate-900">{invoice.code}</span>
                      <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {invoiceStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Gara: <strong className="text-slate-800">{invoice.garage.name}</strong>
                      {invoice.repairOrder ? (
                        <>
                          {" "}• Lệnh: <span className="font-mono">{invoice.repairOrder.code}</span> • Xe:{" "}
                          <span className="font-mono text-blue-600">{invoice.repairOrder.vehicle.licensePlate}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{DATE_FORMATTER.format(new Date(invoice.createdAt))}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>Tổng: <strong className="font-mono">{formatVnd(invoice.totalAmount)}</strong></span>
                  <span>Đã trả: <strong className="font-mono text-emerald-600">{formatVnd(invoice.paidAmount)}</strong></span>
                  <span>Còn lại: <strong className="font-mono text-amber-600">{formatVnd(balance)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
