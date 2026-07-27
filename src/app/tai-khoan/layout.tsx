/**
 * Customer portal shell.
 *
 * The guard here keeps unauthenticated visitors out of the whole area in one
 * place. It is a UX convenience: every page and data-access function inside
 * still scopes its reads by the session user id.
 */

import { Car } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireUserPage } from "@/features/auth/guards";
import { LogoutButton } from "@/features/auth/logout-button";
import { isStaff } from "@/lib/rbac";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requireUserPage("/tai-khoan");

  // Staff accounts have their own area; sending them here would show an empty
  // portal because no `Customer` record is linked to their account.
  if (isStaff(user)) {
    redirect("/bang-dieu-khien");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/60 bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
        <Link
          href="/tai-khoan"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-lg">
            <Car className="size-4" aria-hidden />
          </span>
          AutoCare
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-muted-foreground text-xs">{user.email}</div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
