import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  ListChecks,
  Package,
  User,
  Wrench,
} from "lucide-react";

import { getWorkTasks } from "@/features/work-tasks/service";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { workTaskStatusLabel } from "@/features/repair-orders/labels";
import { formatVnd } from "@/lib/money";

export const metadata: Metadata = {
  title: "Quản lý Công việc · AutoCare",
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function WorkTasksPage() {
  const { garageId } = await requireStaffPermissionPage("/cong-viec", "work-task:read");
  const tasks = await getWorkTasks(garageId);

  const notStartedCount = tasks.filter((t) => t.status === "NOT_STARTED").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const waitingPartsCount = tasks.filter((t) => t.status === "WAITING_PARTS").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ListChecks className="size-6 text-blue-600" />
          <span>Quản lý Tiến độ Công việc Xưởng</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Theo dõi phân công kỹ thuật viên, nhật ký thi công và phụ tùng đã xuất cho từng xe.
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase block">Chờ thực hiện</span>
          <span className="text-2xl font-black text-slate-700 font-mono">{notStartedCount} Hạng mục</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-bold text-blue-600 uppercase block">Đang thi công</span>
          <span className="text-2xl font-black text-blue-600 font-mono">{inProgressCount} Hạng mục</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-bold text-amber-600 uppercase block">Chờ phụ tùng</span>
          <span className="text-2xl font-black text-amber-600 font-mono">{waitingPartsCount} Hạng mục</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase block">Đã hoàn thành</span>
          <span className="text-2xl font-black text-emerald-600 font-mono">{completedCount} Hạng mục</span>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-sm shadow-sm space-y-2">
            <Wrench className="size-10 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-800">Chưa có công việc nào cần xử lý</p>
            <p className="text-xs text-slate-500">
              Công việc tự động tạo khi khách hàng duyệt hạng mục trong báo giá.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const totalMinutesLogged = task.workLogs.reduce((sum, log) => sum + (log.minutesSpent ?? 0), 0);
            const taskTitle = task.quotationItem?.description ?? "Hạng mục sửa chữa xưởng";
            return (
              <div
                key={task.id}
                className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{taskTitle}</h3>
                      <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                        {workTaskStatusLabel(task.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Lệnh sửa chữa: <strong className="text-slate-800 font-mono">{task.repairOrder.code}</strong> • Xe: <span className="font-mono font-bold text-blue-600">{task.repairOrder.vehicle.licensePlate} ({task.repairOrder.vehicle.brand} {task.repairOrder.vehicle.model})</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                    <User className="size-4 text-blue-600" />
                    <span>KTV: <strong>{task.assignedTo?.name ?? "Chưa phân công"}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="size-3.5 text-blue-600" /> Nhật ký làm việc ({task.workLogs.length} lượt log)
                    </span>
                    <p className="text-slate-500">
                      Tổng thời gian đã làm: <strong className="text-slate-900 font-mono">{totalMinutesLogged} phút</strong>
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Package className="size-3.5 text-emerald-600" /> Phụ tùng đã xuất ({task.inventoryTransactions.length} phụ tùng)
                    </span>
                    {task.inventoryTransactions.length === 0 ? (
                      <p className="text-slate-400 italic">Chưa xuất phụ tùng nào</p>
                    ) : (
                      <div className="space-y-0.5">
                        {task.inventoryTransactions.map((tx) => (
                          <div key={tx.id} className="flex justify-between text-slate-700">
                            <span>{tx.part.name} ({tx.part.sku})</span>
                            <span className="font-mono font-bold text-emerald-600">x{Math.abs(tx.quantity)} {tx.part.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
