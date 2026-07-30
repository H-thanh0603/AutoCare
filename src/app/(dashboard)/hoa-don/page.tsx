import type { Metadata } from "next";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  Receipt,
  User,
} from "lucide-react";

import { getInvoices } from "@/features/invoices/service";
import { InvoiceActions } from "@/features/invoices/invoice-actions";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { invoiceStatusLabel } from "@/features/repair-orders/labels";
import { can } from "@/lib/rbac";
import { formatVnd } from "@/lib/money";

export const metadata: Metadata = {
  title: "Quản lý Hóa đơn & Thanh toán · AutoCare",
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function InvoicesPage() {
  const { user, garageId } = await requireStaffPermissionPage("/hoa-don", "invoice:read");
  const invoices = await getInvoices(garageId);
  const canInvoice = can(user, "invoice:write");
  const canPay = can(user, "payment:write");

  let totalCollectedVnd = 0;
  let totalPendingVnd = 0;

  for (const inv of invoices) {
    totalCollectedVnd += inv.paidAmount;
    if (inv.status !== "PAID" && inv.status !== "CANCELLED") {
      totalPendingVnd += Math.max(0, inv.totalAmount - inv.paidAmount);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Banknote className="size-6 text-emerald-600" />
          <span>Quản lý Hóa đơn & Quản lý Thu ngân</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Lập hóa đơn từ lệnh sửa chữa, ghi nhận thanh toán/đặt cọc và theo dõi công nợ khách hàng.
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Tổng số Hóa đơn</span>
          <span className="text-2xl font-black text-slate-900 font-mono">{invoices.length} Hóa đơn</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-1">
          <span className="text-xs font-bold text-emerald-600 uppercase block">Doanh thu đã thu</span>
          <span className="text-2xl font-black text-emerald-600 font-mono">{formatVnd(totalCollectedVnd)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-1">
          <span className="text-xs font-bold text-amber-600 uppercase block">Công nợ chờ thu</span>
          <span className="text-2xl font-black text-amber-600 font-mono">{formatVnd(totalPendingVnd)}</span>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-sm shadow-sm space-y-2">
            <Receipt className="size-10 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-800">Chưa có hóa đơn nào</p>
            <p className="text-xs text-slate-500">
              Hóa đơn được tạo từ các Lệnh sửa chữa đã hoàn thành hạng mục.
            </p>
          </div>
        ) : (
          invoices.map((inv) => {
            const dueBalance = Math.max(0, inv.totalAmount - inv.paidAmount);
            const vehicleText = inv.repairOrder?.vehicle
              ? `${inv.repairOrder.vehicle.licensePlate} (${inv.repairOrder.vehicle.brand} ${inv.repairOrder.vehicle.model})`
              : "Xe chưa ghi nhận";

            return (
              <div
                key={inv.id}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-lg text-slate-900">{inv.code}</span>
                      <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {invoiceStatusLabel(inv.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Khách hàng: <strong className="text-slate-800">{inv.customer.name}</strong> ({inv.customer.phone}) • Xe: <span className="font-mono font-bold text-blue-600">{vehicleText}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-semibold">Tổng tiền hóa đơn</span>
                    <span className="text-xl font-black text-blue-600 font-mono">{formatVnd(inv.totalAmount)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Đã thanh toán:</span>
                    <strong className="text-emerald-600 font-mono text-sm">{formatVnd(inv.paidAmount)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Còn phải thu:</span>
                    <strong className="text-amber-600 font-mono text-sm">{formatVnd(dueBalance)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Lịch sử thanh toán:</span>
                    <span className="font-semibold text-slate-700">{inv.payments.length} lượt giao dịch</span>
                  </div>
                </div>

                {inv.payments.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-700">Chi tiết giao dịch thanh toán:</span>
                    <div className="space-y-1.5">
                      {inv.payments.map((pm) => (
                        <div key={pm.id} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span className="font-medium text-slate-800">{pm.type} • {pm.method}</span>
                            {pm.reference && <span className="text-slate-400 font-mono">({pm.reference})</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-emerald-600">{formatVnd(pm.amount)}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{DATE_TIME_FORMATTER.format(new Date(pm.paidAt))}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <InvoiceActions
                  invoiceId={inv.id}
                  status={inv.status}
                  balance={dueBalance}
                  canInvoice={canInvoice}
                  canPay={canPay}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
