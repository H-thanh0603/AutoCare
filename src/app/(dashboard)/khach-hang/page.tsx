import type { Metadata } from "next";

import { listCustomers } from "@/data/customers";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
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
  title: "Khách hàng · AutoCare",
};

export default async function CustomersPage() {
  const { garageId } = await requireStaffPermissionPage("/khach-hang", "customer:read");
  const customers = await listCustomers(garageId, { take: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khách hàng"
        description="Khách hàng của xưởng, sắp xếp theo tên."
      />

      {customers.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            Chưa có khách hàng nào.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Tên khách</TableHead>
                <TableHead>Điện thoại</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Số xe</TableHead>
                <TableHead className="px-4">Tài khoản</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="px-4 font-medium">{customer.name}</TableCell>
                  <TableCell className="tabular-nums">{customer.phone}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {customer.vehicleCount}
                  </TableCell>
                  <TableCell className="px-4">
                    {customer.userId ? (
                      <Badge variant="secondary">Đã liên kết</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Chưa có</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
