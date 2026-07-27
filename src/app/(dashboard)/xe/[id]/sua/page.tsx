import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCustomerOptions } from "@/data/customers";
import { getVehicleDetail } from "@/data/vehicles";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";
import { VehicleForm } from "@/features/vehicles/vehicle-form";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { garageId } = await requireStaffPermissionPage("/xe", "vehicle:write");
  const vehicle = await getVehicleDetail(garageId, (await params).id);
  const owners = await listCustomerOptions(garageId);
  return <div className="space-y-6"><PageHeader title="Sửa xe" description={vehicle.licensePlate} /><Card><CardHeader><CardTitle>Thông tin xe</CardTitle></CardHeader><CardContent><VehicleForm vehicleId={vehicle.id} owners={owners} defaultValues={{ licensePlate: vehicle.licensePlate, vin: vehicle.vin ?? "", brand: vehicle.brand, model: vehicle.model, year: vehicle.year?.toString() ?? "", color: vehicle.color ?? "", engineNumber: vehicle.engineNumber ?? "" }} /></CardContent></Card></div>;
}
