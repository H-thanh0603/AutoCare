import type { Metadata } from "next";

import { listVehicles } from "@/data/vehicles";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Xe · AutoCare",
};

const KM_FORMATTER = new Intl.NumberFormat("vi-VN");

export default async function VehiclesPage() {
  const { garageId } = await requireStaffPermissionPage("/xe", "vehicle:read");
  const vehicles = await listVehicles(garageId, { take: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xe"
        description="Xe đang thuộc sở hữu của khách hàng tại xưởng này."
      />

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            Chưa có xe nào.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Biển số</TableHead>
                <TableHead>Xe</TableHead>
                <TableHead>Năm</TableHead>
                <TableHead className="text-right">Số km</TableHead>
                <TableHead className="px-4">Chủ xe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="px-4 font-medium">
                    {vehicle.licensePlate}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vehicle.brand} {vehicle.model}
                  </TableCell>
                  <TableCell className="tabular-nums">{vehicle.year ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {vehicle.currentKm === null
                      ? "—"
                      : KM_FORMATTER.format(vehicle.currentKm)}
                  </TableCell>
                  <TableCell className="px-4">{vehicle.owner?.name ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
