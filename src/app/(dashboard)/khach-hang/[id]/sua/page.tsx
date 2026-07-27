import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomerDetail } from "@/data/customers";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { CustomerForm } from "@/features/customers/customer-form";
import { PageHeader } from "@/features/dashboard/page-shell";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { garageId } = await requireStaffPermissionPage("/khach-hang", "customer:write");
  const customer = await getCustomerDetail(garageId, (await params).id);
  return <div className="space-y-6"><PageHeader title="Sửa khách hàng" description={customer.name} /><Card><CardHeader><CardTitle>Thông tin khách hàng</CardTitle></CardHeader><CardContent><CustomerForm customerId={customer.id} defaultValues={{ name: customer.name, phone: customer.phone, email: customer.email ?? "", address: customer.address ?? "", note: customer.note ?? "" }} /></CardContent></Card></div>;
}
