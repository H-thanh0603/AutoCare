import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomerDetail } from "@/data/customers";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, garageId } = await requireStaffPermissionPage("/khach-hang", "customer:read");
  const customer = await getCustomerDetail(garageId, (await params).id);
  const canWrite = user.garageRole === "RECEPTIONIST" || user.garageRole === "GARAGE_MANAGER";
  return <div className="space-y-6"><PageHeader title={customer.name} description={customer.phone} action={canWrite ? <Button render={<Link href={`/khach-hang/${customer.id}/sua`} />}>Sửa</Button> : undefined} /><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Liên hệ</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{customer.email ?? "Chưa có email"}</p><p>{customer.address ?? "Chưa có địa chỉ"}</p>{customer.note ? <p className="text-muted-foreground">{customer.note}</p> : null}</CardContent></Card><Card><CardHeader><CardTitle>Xe đang sở hữu</CardTitle></CardHeader><CardContent>{customer.vehicles.length ? <ul className="space-y-2 text-sm">{customer.vehicles.map((vehicle) => <li key={vehicle.id}><Link className="font-medium hover:underline" href={`/xe/${vehicle.id}`}>{vehicle.licensePlate}</Link> · {vehicle.brand} {vehicle.model}</li>)}</ul> : <p className="text-sm text-muted-foreground">Chưa có xe.</p>}</CardContent></Card></div><Card><CardHeader><CardTitle>Lệnh sửa chữa gần đây</CardTitle></CardHeader><CardContent>{customer.repairOrders.length ? <ul className="space-y-2 text-sm">{customer.repairOrders.map((order) => <li key={order.id}><span className="font-medium">{order.code}</span> · {order.vehicle.licensePlate} · {order.status}</li>)}</ul> : <p className="text-sm text-muted-foreground">Chưa có lệnh sửa chữa.</p>}</CardContent></Card></div>;
}
