import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Tag,
  Wrench,
} from "lucide-react";

import { requireStaffPermissionPage } from "@/features/auth/guards";
import { InventoryManager } from "@/features/inventory/inventory-manager";
import { can } from "@/lib/rbac";
import { formatVnd } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Kho Phụ tùng · AutoCare",
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function InventoryPage() {
  const { user, garageId } = await requireStaffPermissionPage("/kho", "inventory:read");

  const [parts, recentTx] = await Promise.all([
    prisma.part.findMany({
      where: { garageId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryTransaction.findMany({
      where: { garageId },
      include: { part: { select: { name: true, sku: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  let totalCostValueVnd = 0;
  let totalRetailValueVnd = 0;
  let lowStockCount = 0;

  for (const p of parts) {
    if (p.quantityInStock > 0) {
      totalCostValueVnd += p.quantityInStock * p.costPrice;
      totalRetailValueVnd += p.quantityInStock * p.sellPrice;
    }
    if (p.quantityInStock <= p.lowStockThreshold) {
      lowStockCount++;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Package className="size-6 text-blue-600" />
          <span>Quản lý Kho & Phụ tùng Ô tô</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Theo dõi tồn kho real-time, giá vốn, giá niêm yết và biến động nhập/xuất kho.
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Tổng loại Phụ tùng</span>
          <span className="text-2xl font-black text-slate-900 font-mono">{parts.length} Mặt hàng</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-blue-600 uppercase block">Tổng giá trị vốn kho</span>
          <span className="text-xl font-black text-blue-600 font-mono">{formatVnd(totalCostValueVnd)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-emerald-600 uppercase block">Tổng giá trị bán niêm yết</span>
          <span className="text-xl font-black text-emerald-600 font-mono">{formatVnd(totalRetailValueVnd)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-amber-600 uppercase block">Cảnh báo tồn kho thấp</span>
          <span className="text-2xl font-black text-amber-600 font-mono">{lowStockCount} Mặt hàng</span>
        </div>
      </div>

      {/* Inventory management actions */}
      <InventoryManager
        parts={parts.map((p) => ({ id: p.id, name: p.name, sku: p.sku, unit: p.unit }))}
        canWrite={can(user, "part:write")}
        canAdjust={can(user, "inventory:adjust")}
      />

      {/* Parts Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Boxes className="size-5 text-blue-600" />
            <span>Danh Sách Tồn Kho Phụ Tùng ({parts.length})</span>
          </h2>
        </div>

        {parts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-2">
            <Package className="size-10 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-800">Kho hàng đang trống</p>
            <p className="text-xs text-slate-500">Chưa tạo mã phụ tùng nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mã SKU</th>
                  <th className="py-3 px-4">Tên phụ tùng</th>
                  <th className="py-3 px-4">Đơn vị</th>
                  <th className="py-3 px-4">Giá nhập</th>
                  <th className="py-3 px-4">Giá bán</th>
                  <th className="py-3 px-4">Tồn kho</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parts.map((p) => {
                  const isLowStock = p.quantityInStock <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.sku}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{p.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{p.unit}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{formatVnd(p.costPrice)}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">{formatVnd(p.sellPrice)}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-sm text-slate-900">
                        {p.quantityInStock} {p.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <AlertTriangle className="size-3 text-amber-600" /> Tồn thấp
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-600" /> Đủ hàng
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Inventory Transactions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
          Nhật Ký Biến Động Nhập / Xuất Kho Gần Đây
        </h2>

        {recentTx.length === 0 ? (
          <p className="text-slate-400 text-xs italic">Chưa có giao dịch biến động kho nào.</p>
        ) : (
          <div className="space-y-2">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-xs p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  {tx.quantity > 0 ? (
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <ArrowUpRight className="size-4" />
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <ArrowDownRight className="size-4" />
                    </span>
                  )}
                  <div>
                    <span className="font-bold text-slate-900 block">{tx.part.name} ({tx.part.sku})</span>
                    <span className="text-slate-500 text-[11px]">{tx.type} • {tx.reason ?? "Giao dịch hệ thống"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-mono font-black text-sm block ${tx.quantity > 0 ? "text-emerald-600" : "text-blue-600"}`}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.part.unit}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{DATE_TIME_FORMATTER.format(new Date(tx.createdAt))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
