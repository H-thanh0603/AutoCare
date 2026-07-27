import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listVehicles } from "@/data/vehicles";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";

export const metadata: Metadata = { title: "Xe · AutoCare" };
const KM_FORMATTER = new Intl.NumberFormat("vi-VN");

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user, garageId } = await requireStaffPermissionPage("/xe", "vehicle:read");
  const q = (await searchParams).q?.trim() ?? "";
  const vehicles = await listVehicles(garageId, { search: q || undefined, take: 50 });
  const canWrite = user.garageRole === "RECEPTIONIST" || user.garageRole === "GARAGE_MANAGER";
  return <div className="space-y-6"><PageHeader title="Xe" description="Tìm theo biển số hoặc số VIN / số khung." action={canWrite ? <Button render={<Link href="/xe/moi" />}>Thêm xe</Button> : undefined} /><form className="flex max-w-md gap-2" role="search"><Input name="q" defaultValue={q} placeholder="Biển số hoặc số VIN" aria-label="Tìm xe" /><Button type="submit" variant="outline">Tìm</Button></form>{vehicles.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{q ? "Không tìm thấy xe phù hợp." : "Chưa có xe nào."}</CardContent></Card> : <Card className="overflow-hidden p-0"><Table><TableHeader><TableRow><TableHead className="px-4">Biển số</TableHead><TableHead>Xe</TableHead><TableHead>Năm</TableHead><TableHead className="text-right">Số km</TableHead><TableHead className="px-4">Chủ xe</TableHead></TableRow></TableHeader><TableBody>{vehicles.map((vehicle) => <TableRow key={vehicle.id}><TableCell className="px-4 font-medium"><Link className="hover:underline" href={`/xe/${vehicle.id}`}>{vehicle.licensePlate}</Link></TableCell><TableCell className="text-muted-foreground">{vehicle.brand} {vehicle.model}</TableCell><TableCell className="tabular-nums">{vehicle.year ?? "—"}</TableCell><TableCell className="text-right tabular-nums">{vehicle.currentKm === null ? "—" : KM_FORMATTER.format(vehicle.currentKm)}</TableCell><TableCell className="px-4">{vehicle.owner?.name ?? "—"}</TableCell></TableRow>)}</TableBody></Table></Card>}</div>;
}
