import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { CustomerForm } from "@/features/customers/customer-form";
import { PageHeader } from "@/features/dashboard/page-shell";

export default async function NewCustomerPage() {
  await requireStaffPermissionPage("/khach-hang/moi", "customer:write");
  return <div className="space-y-6"><PageHeader title="Thêm khách hàng" description="Thông tin này được dùng cho lịch sử sửa chữa và liên hệ." /><Card><CardHeader><CardTitle>Thông tin khách hàng</CardTitle></CardHeader><CardContent><CustomerForm /></CardContent></Card></div>;
}
