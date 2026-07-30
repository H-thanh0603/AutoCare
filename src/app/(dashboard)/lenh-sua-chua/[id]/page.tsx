import { getRepairOrderDetail } from "@/data/repair-orders";
import { getInspectionForRepairOrder } from "@/data/inspections";
import { listQuotationsForRepairOrder } from "@/data/quotations";
import { listGarageTechnicians } from "@/data/garages";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { saveInspectionFormAction, startInspectionFormAction } from "@/features/inspections/actions";
import { saveQuotationDraftFormAction, sendQuotationFormAction } from "@/features/quotations/actions";
import { getInvoices } from "@/features/invoices/service";
import { InvoicePanel } from "@/features/invoices/invoice-panel";
import { RepairOrderStageActions } from "@/features/repair-orders/repair-order-stage-actions";
import { quotationStatusLabel, repairOrderStatusLabel } from "@/features/repair-orders/labels";
import { getWorkTasks } from "@/features/work-tasks/service";
import { WorkTaskBoard } from "@/features/work-tasks/work-task-board";
import { can } from "@/lib/rbac";
import { formatVnd } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RepairOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, garageId } = await requireStaffPermissionPage("/lenh-sua-chua", "repair-order:read");
  const order = await getRepairOrderDetail(garageId, (await params).id);
  const [inspection, quotations, workTasks, invoices, technicians] = await Promise.all([
    getInspectionForRepairOrder(garageId, order.id),
    listQuotationsForRepairOrder(garageId, order.id),
    getWorkTasks(garageId, { repairOrderId: order.id }),
    getInvoices(garageId, { repairOrderId: order.id }),
    listGarageTechnicians(garageId),
  ]);

  const checklist =
    order.intakeChecklist && typeof order.intakeChecklist === "object"
      ? (order.intakeChecklist as Record<string, unknown>)
      : {};

  const canAssign = can(user, "work-task:assign");
  const canProgress = can(user, "work-task:progress") || can(user, "work-task:write");
  const canQualityCheck = can(user, "quality-check:write");
  const canDeliver = can(user, "repair-order:deliver");
  const canInvoice = can(user, "invoice:write");
  const canPay = can(user, "payment:write");

  const showStageCard = order.status === "QUALITY_CHECK" || order.status === "READY_FOR_DELIVERY";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{order.code}</h1>
          <Badge variant="secondary">{repairOrderStatusLabel(order.status)}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {order.vehicle.licensePlate} · {order.customer.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tiếp nhận xe</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Số km:</span>{" "}
            {order.mileageKm?.toLocaleString("vi-VN") ?? "Chưa ghi"}
          </p>
          <p>
            <span className="text-muted-foreground">Nhiên liệu:</span>{" "}
            {order.fuelLevel === null ? "Chưa ghi" : `${order.fuelLevel}%`}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Ghi chú:</span> {order.initialNote ?? "Không có"}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Checklist:</span>{" "}
            {Object.entries(checklist)
              .filter(([, value]) => value)
              .map(([key]) => key)
              .join(", ") || "Chưa đánh dấu"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kiểm tra xe</CardTitle>
        </CardHeader>
        <CardContent>
          {inspection ? (
            <form action={saveInspectionFormAction} className="grid gap-3">
              <input type="hidden" name="repairOrderId" value={order.id} />
              <textarea
                name="summary"
                defaultValue={inspection.summary ?? ""}
                placeholder="Tổng kết kiểm tra"
                className="min-h-20 rounded-md border p-2"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input name="category" placeholder="Hệ thống" required className="rounded-md border p-2" />
                <input name="name" placeholder="Hạng mục" required className="rounded-md border p-2" />
                <select name="severity" className="rounded-md border p-2">
                  <option value="OK">Bình thường</option>
                  <option value="ATTENTION">Cần theo dõi</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
                <input name="finding" placeholder="Phát hiện" className="rounded-md border p-2" />
              </div>
              <input name="recommendation" placeholder="Khuyến nghị" className="rounded-md border p-2" />
              <Button type="submit">Lưu kiểm tra</Button>
            </form>
          ) : (
            <form action={startInspectionFormAction}>
              <input type="hidden" name="repairOrderId" value={order.id} />
              <Button type="submit">Bắt đầu kiểm tra</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Báo giá</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.status === "INSPECTING" && (
            <form action={saveQuotationDraftFormAction} className="grid gap-2">
              <input type="hidden" name="repairOrderId" value={order.id} />
              <input name="description" required placeholder="Hạng mục" className="rounded-md border p-2" />
              <div className="grid grid-cols-3 gap-2">
                <input name="quantity" type="number" min="1" defaultValue="1" className="rounded-md border p-2" />
                <input name="unitPrice" type="number" min="0" placeholder="Đơn giá" className="rounded-md border p-2" />
                <input name="discountAmount" type="number" min="0" defaultValue="0" className="rounded-md border p-2" />
              </div>
              <Button type="submit">Tạo báo giá nháp</Button>
            </form>
          )}
          {quotations.map((quotation) => (
            <div key={quotation.id} className="rounded-md border p-3">
              <div className="flex justify-between">
                <span>Phiên bản {quotation.versionNo}</span>
                <Badge variant="secondary">{quotationStatusLabel(quotation.status)}</Badge>
              </div>
              <p className="mt-1 font-medium">{formatVnd(quotation.totalAmount)}</p>
              {quotation.status === "DRAFT" && (
                <form action={sendQuotationFormAction} className="mt-2">
                  <input type="hidden" name="quotationId" value={quotation.id} />
                  <Button type="submit" size="sm">
                    Gửi khách duyệt
                  </Button>
                </form>
              )}
            </div>
          ))}
          {quotations.length === 0 && order.status !== "INSPECTING" ? (
            <p className="text-sm text-muted-foreground italic">Chưa có báo giá.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Công việc sửa chữa</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkTaskBoard
            tasks={workTasks.map((task) => ({
              id: task.id,
              title: task.title,
              status: task.status,
              assignedTo: task.assignedTo ? { id: task.assignedTo.id, name: task.assignedTo.name } : null,
            }))}
            technicians={technicians}
            canAssign={canAssign}
            canProgress={canProgress}
          />
        </CardContent>
      </Card>

      {showStageCard ? (
        <Card>
          <CardHeader>
            <CardTitle>Nghiệm thu & Bàn giao</CardTitle>
          </CardHeader>
          <CardContent>
            <RepairOrderStageActions
              repairOrderId={order.id}
              status={order.status}
              canQualityCheck={canQualityCheck}
              canDeliver={canDeliver}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Hóa đơn & Thanh toán</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicePanel
            repairOrderId={order.id}
            invoices={invoices.map((invoice) => ({
              id: invoice.id,
              code: invoice.code,
              status: invoice.status,
              totalAmount: invoice.totalAmount,
              paidAmount: invoice.paidAmount,
            }))}
            canInvoice={canInvoice}
            canPay={canPay}
          />
        </CardContent>
      </Card>
    </div>
  );
}
