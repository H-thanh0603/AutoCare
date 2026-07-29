import { getPortalQuotation } from "@/data/portal";
import { requireUserPage } from "@/features/auth/guards";
import { decideQuotationItemFormAction } from "@/features/quotations/actions";
import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage("/tai-khoan");
  const quotation = await getPortalQuotation(user.id, (await params).id);
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Báo giá xe {quotation.repairOrder.vehicle.licensePlate}</h1><p className="text-muted-foreground text-sm">{quotation.repairOrder.garage.name} · {quotation.repairOrder.code}</p></div><Card><CardHeader><CardTitle>Phiên bản {quotation.versionNo}</CardTitle></CardHeader><CardContent className="space-y-4">{quotation.items.map((item) => <div key={item.id} className="border-b pb-4 last:border-0"><div className="flex justify-between gap-3"><span className="font-medium">{item.description}</span><span>{formatVnd(item.totalAmount)}</span></div><p className="text-muted-foreground mt-1 text-sm">Số lượng: {item.quantity} · {item.status}</p>{(quotation.status === "SENT" || quotation.status === "PARTIALLY_APPROVED") && item.status === "PENDING" && <div className="mt-3 flex gap-2"><form action={decideQuotationItemFormAction}><input type="hidden" name="quotationItemId" value={item.id}/><input type="hidden" name="status" value="APPROVED"/><Button type="submit" size="sm">Đồng ý</Button></form><form action={decideQuotationItemFormAction}><input type="hidden" name="quotationItemId" value={item.id}/><input type="hidden" name="status" value="REJECTED"/><Button type="submit" size="sm" variant="outline">Từ chối</Button></form></div>}</div>)}<p className="text-right text-lg font-semibold">Tổng: {formatVnd(quotation.totalAmount)}</p></CardContent></Card></div>;
}
