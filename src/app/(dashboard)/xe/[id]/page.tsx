import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCustomerOptions } from "@/data/customers";
import { getVehicleDetail } from "@/data/vehicles";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";
import { VehicleHistoryForms } from "@/features/vehicles/vehicle-history-forms";

const KM_FORMATTER = new Intl.NumberFormat("vi-VN");
const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, garageId } = await requireStaffPermissionPage("/xe", "vehicle:read");
  const vehicle = await getVehicleDetail(garageId, (await params).id);
  const canWrite = user.garageRole === "RECEPTIONIST" || user.garageRole === "GARAGE_MANAGER";
  const owners = canWrite ? await listCustomerOptions(garageId) : [];
  return <div className="space-y-6"><PageHeader title={vehicle.licensePlate} description={`${vehicle.brand} ${vehicle.model}${vehicle.year ? ` · ${vehicle.year}` : ""}`} action={canWrite ? <Button render={<Link href={`/xe/${vehicle.id}/sua`} />}>Sửa</Button> : undefined} /><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Số km hiện tại</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{vehicle.currentKm === null ? "—" : `${KM_FORMATTER.format(vehicle.currentKm)} km`}</CardContent></Card><Card><CardHeader><CardTitle>Chủ sở hữu hiện tại</CardTitle></CardHeader><CardContent className="text-sm">{vehicle.owner ? <Link className="font-medium hover:underline" href={`/khach-hang/${vehicle.owner.id}`}>{vehicle.owner.name}</Link> : "—"}</CardContent></Card><Card><CardHeader><CardTitle>Số VIN / số khung</CardTitle></CardHeader><CardContent className="font-mono text-sm">{vehicle.vin ?? "Chưa có"}</CardContent></Card></div><section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Lịch sử số km</CardTitle></CardHeader><CardContent>{vehicle.mileageLogs.length ? <ul className="space-y-3 text-sm">{vehicle.mileageLogs.map((log) => <li key={log.id} className="border-b pb-3 last:border-0"><p className="font-medium tabular-nums">{KM_FORMATTER.format(log.mileageKm)} km</p><p className="text-muted-foreground">{DATE_FORMATTER.format(log.recordedAt)}{log.note ? ` · ${log.note}` : ""}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Chưa có lịch sử số km.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Lịch sử chủ sở hữu</CardTitle></CardHeader><CardContent>{vehicle.ownerships.length ? <ul className="space-y-3 text-sm">{vehicle.ownerships.map((ownership) => <li key={ownership.id} className="border-b pb-3 last:border-0"><p className="font-medium">{ownership.customer.name}</p><p className="text-muted-foreground">Từ {DATE_FORMATTER.format(ownership.startedAt)}{ownership.endedAt ? ` đến ${DATE_FORMATTER.format(ownership.endedAt)}` : " · Hiện tại"}</p></li>)}</ul> : null}</CardContent></Card></section>{canWrite ? <Card><CardContent className="pt-6"><VehicleHistoryForms vehicleId={vehicle.id} owners={owners} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Timeline xe</CardTitle></CardHeader><CardContent>{vehicle.timeline.length ? <ol className="space-y-4">{vehicle.timeline.map((event) => <li key={event.id} className="border-l-2 border-primary/30 pl-4"><p className="font-medium text-sm">{event.title}</p><p className="text-xs text-muted-foreground">{DATE_FORMATTER.format(event.occurredAt)}{event.mileageKm !== null ? ` · ${KM_FORMATTER.format(event.mileageKm)} km` : ""}</p>{event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}</li>)}</ol> : <p className="text-sm text-muted-foreground">Chưa có sự kiện timeline.</p>}</CardContent></Card></div>;
}
