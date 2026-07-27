"use client";

/**
 * Dashboard sidebar.
 *
 * A client component only because the active link depends on the current path.
 * The item list is computed on the server and passed in as serializable data.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "./nav";

export interface SidebarItem {
  href: string;
  label: string;
}

/** Resolves the icon from the static nav table so props stay serializable. */
function iconFor(href: string) {
  return DASHBOARD_NAV.find((item) => item.href === href)?.icon;
}

export function DashboardSidebar({ items }: { items: readonly SidebarItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="flex flex-col gap-0.5 p-2">
      {items.map((item) => {
        const Icon = iconFor(item.href);
        // Exact match for the overview, prefix match elsewhere so detail pages
        // keep their section highlighted.
        const isActive =
          item.href === "/bang-dieu-khien"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
