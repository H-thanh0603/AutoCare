import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wrench,
} from "lucide-react";

import { getDashboardSummary } from "@/data/dashboard";
import { listRepairOrders } from "@/data/repair-orders";
import { OPEN_REPAIR_ORDER_STATUSES } from "@/data/dashboard";
import { requireStaffPage } from "@/features/auth/guards";
import { getDashboardMetrics } from "@/features/dashboard/reports-service";
import { repairOrderStatusLabel } from "@/features/repair-orders/labels";
import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Bảng điều khiển · AutoCare",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const { garageId, user } = await requireStaffPage("/bang-dieu-khien");

  const [summary, metrics, orders] = await Promise.all([
    getDashboardSummary(garageId),
    getDashboardMetrics(garageId),
    listRepairOrders(garageId, { statuses: OPEN_REPAIR_ORDER_STATUSES, take: 8 }),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white backdrop-blur-sm">
              <Sparkles className="size-3.5 text-amber-300 fill-amber-300" />
              <span>Bảng Điều Khiển Gara Vận Hành</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Xin chào, {user.name}!
            </h1>
            <p className="text-blue-100 text-sm max-w-xl font-medium">
              Hệ thống ghi nhận <strong className="text-white font-mono">{summary.openOrders} xe</strong> đang làm việc tại xưởng hôm nay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              render={<Link href="/lenh-sua-chua" />}
              className="bg-white hover:bg-slate-100 text-blue-700 font-black px-5 h-11 rounded-2xl shadow-lg transition-transform hover:scale-105"
            >
              <Plus className="size-4 mr-1.5" />
              <span>Tạo Lệnh Sửa Chữa Mới</span>
            </Button>
            <Button
              variant="outline"
              render={<Link href="/lich-hen" />}
              className="border-white/40 bg-white/10 hover:bg-white/20 text-white font-bold px-5 h-11 rounded-2xl"
            >
              <CalendarClock className="size-4 mr-1.5" />
              <span>Xem Lịch Hẹn</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main KPI Revenue & Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh thu tháng này</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-600 font-mono block">
              {formatVnd(metrics.monthlyRevenueVnd)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Thanh toán đã thực thu</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Công nợ chưa thu</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Banknote className="size-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-amber-600 font-mono block">
              {formatVnd(metrics.pendingBalanceVnd)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Hóa đơn chờ thanh toán</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Xe đang tại Xưởng</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Wrench className="size-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-blue-600 font-mono block">
              {summary.openOrders} Xe
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Đang kiểm tra & thi công</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lịch hẹn hôm nay</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <CalendarClock className="size-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-indigo-600 font-mono block">
              {summary.appointmentsToday} Khách
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Lịch đặt đã xác nhận</span>
          </div>
        </div>
      </div>

      {/* Operational Task Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/bao-gia" className="block group">
          <div className="bg-white border border-slate-200 group-hover:border-amber-400 rounded-3xl p-5 shadow-sm group-hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">Chờ khách duyệt</span>
              <span className="text-xl font-black text-amber-600 font-mono">{summary.waitingApproval} Lệnh</span>
            </div>
            <AlertTriangle className="size-6 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
        </Link>

        <Link href="/lenh-sua-chua" className="block group">
          <div className="bg-white border border-slate-200 group-hover:border-emerald-400 rounded-3xl p-5 shadow-sm group-hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">Xe chờ giao</span>
              <span className="text-xl font-black text-emerald-600 font-mono">{summary.readyForDelivery} Xe</span>
            </div>
            <CheckCircle2 className="size-6 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
        </Link>

        <Link href="/kho" className="block group">
          <div className="bg-white border border-slate-200 group-hover:border-red-400 rounded-3xl p-5 shadow-sm group-hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">Phụ tùng sắp hết</span>
              <span className="text-xl font-black text-red-600 font-mono">{summary.lowStockParts} Mã</span>
            </div>
            <Package className="size-6 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
        </Link>

        <Link href="/hoa-don" className="block group">
          <div className="bg-white border border-slate-200 group-hover:border-blue-400 rounded-3xl p-5 shadow-sm group-hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">Hóa đơn chưa thu</span>
              <span className="text-xl font-black text-blue-600 font-mono">{summary.unpaidInvoices} Hóa đơn</span>
            </div>
            <Banknote className="size-6 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Active Repair Orders Section */}
      <section aria-labelledby="open-orders-heading" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="open-orders-heading" className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Car className="size-5 text-blue-600" />
              <span>Lệnh Sửa Chữa Đang Xử Lý ({orders.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Danh sách các xe đang nằm trong xưởng tiếp nhận & làm hàng.</p>
          </div>
          <Link
            href="/lenh-sua-chua"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Xem tất cả lệnh</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Hiện không có lệnh sửa chữa nào đang hoạt động.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/lenh-sua-chua/${order.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-900 text-sm">{order.code}</span>
                    <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                      {repairOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Biển số: <strong className="text-slate-900 font-mono text-sm">{order.vehicle.licensePlate}</strong> ({order.vehicle.brand} {order.vehicle.model}) • Khách: {order.customer.name}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs">
                  <span className="font-mono text-slate-400">
                    {DATE_FORMATTER.format(order.receivedAt)}
                  </span>
                  <ChevronRight className="size-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
