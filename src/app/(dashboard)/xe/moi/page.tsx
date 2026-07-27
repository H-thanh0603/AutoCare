import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCustomerOptions } from "@/data/customers";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";
import { VehicleForm } from "@/features/vehicles/vehicle-form";

export default async function NewVehiclePage() {
  const { garageId } = await requireStaffPermissionPage("/xe/moi", "vehicle:write");
  const owners = await listCustomerOptions(garageId);
  return <div className="space-y-6"><PageHeader title="Thêm xe" description="Xe cần có chủ sở hữu thuộc gara này." /><Card><CardHeader><CardTitle>Thông tin xe</CardTitle></CardHeader><CardContent><VehicleForm owners={owners} /></CardContent></Card></div>;
}
