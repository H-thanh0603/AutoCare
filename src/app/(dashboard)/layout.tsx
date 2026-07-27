/**
 * Garage dashboard shell.
 *
 * The layout guard is a convenience: it keeps unauthenticated or non-staff
 * visitors out of the whole area in one place. Every page, action and data-access
 * function inside still enforces its own permissions and garage scope.
 */

import { Car } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { getGarageById } from "@/data/garages";
import { requireStaffPage } from "@/features/auth/guards";
import { LogoutButton } from "@/features/auth/logout-button";
import { garageRoleLabel, navFor } from "@/features/dashboard/nav";
import { DashboardSidebar } from "@/features/dashboard/sidebar";
import { Badge } from "@/components/ui/badge";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, garageId, garageRole } = await requireStaffPage("/bang-dieu-khien");
  const garage = await getGarageById(garageId);
  const items = navFor(user).map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/60 bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
        <Link
          href="/bang-dieu-khien"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-lg">
            <Car className="size-4" aria-hidden />
          </span>
          AutoCare
        </Link>

        <span className="text-muted-foreground hidden text-sm sm:inline" aria-hidden>
          /
        </span>
        <span className="text-muted-foreground hidden truncate text-sm sm:inline">
          {garage.name}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-muted-foreground text-xs">{user.email}</div>
          </div>
          <Badge variant="secondary">{garageRoleLabel(garageRole)}</Badge>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="border-border/60 hidden w-56 shrink-0 border-r md:block">
          <div className="sticky top-14">
            <DashboardSidebar items={items} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
