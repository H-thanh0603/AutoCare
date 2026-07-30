import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCustomers } from "@/data/customers";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "Khách hàng · AutoCare" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user, garageId } = await requireStaffPermissionPage("/khach-hang", "customer:read");
  const q = (await searchParams).q?.trim() ?? "";
  const customers = await listCustomers(garageId, { search: q || undefined, take: 50 });
  const canWrite = can(user, "customer:write");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khách hàng"
        description="Tìm theo tên hoặc số điện thoại."
        action={canWrite ? <Button render={<Link href="/khach-hang/moi" />}>Thêm khách hàng</Button> : undefined}
      />
      <form className="flex max-w-md gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Tên hoặc số điện thoại" aria-label="Tìm khách hàng" />
        <Button type="submit" variant="outline">Tìm</Button>
      </form>
      {customers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{q ? "Không tìm thấy khách hàng phù hợp." : "Chưa có khách hàng nào."}</CardContent></Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="px-4">Tên khách</TableHead><TableHead>Điện thoại</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Số xe</TableHead><TableHead className="px-4">Tài khoản</TableHead></TableRow></TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="px-4 font-medium"><Link className="hover:underline" href={`/khach-hang/${customer.id}`}>{customer.name}</Link></TableCell>
                  <TableCell className="tabular-nums">{customer.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{customer.vehicleCount}</TableCell>
                  <TableCell className="px-4">{customer.userId ? <Badge variant="secondary">Đã liên kết</Badge> : <span className="text-xs text-muted-foreground">Chưa có</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
