import { getRepairOrderDetail } from "@/data/repair-orders";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { repairOrderStatusLabel } from "@/features/repair-orders/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RepairOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { garageId } = await requireStaffPermissionPage("/lenh-sua-chua", "repair-order:read");
  const order = await getRepairOrderDetail(garageId, (await params).id);
  const checklist = order.intakeChecklist && typeof order.intakeChecklist === "object" ? order.intakeChecklist as Record<string, unknown> : {};
  return <div className="space-y-6"><div><div className="flex items-center gap-3"><h1 className="font-mono text-2xl font-semibold">{order.code}</h1><Badge variant="secondary">{repairOrderStatusLabel(order.status)}</Badge></div><p className="text-muted-foreground mt-1 text-sm">{order.vehicle.licensePlate} · {order.customer.name}</p></div><Card><CardHeader><CardTitle>Tiếp nhận xe</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Số km:</span> {order.mileageKm?.toLocaleString("vi-VN") ?? "Chưa ghi"}</p><p><span className="text-muted-foreground">Nhiên liệu:</span> {order.fuelLevel === null ? "Chưa ghi" : `${order.fuelLevel}%`}</p><p className="sm:col-span-2"><span className="text-muted-foreground">Ghi chú:</span> {order.initialNote ?? "Không có"}</p><p className="sm:col-span-2"><span className="text-muted-foreground">Checklist:</span> {Object.entries(checklist).filter(([, value]) => value).map(([key]) => key).join(", ") || "Chưa đánh dấu"}</p></CardContent></Card></div>;
}
