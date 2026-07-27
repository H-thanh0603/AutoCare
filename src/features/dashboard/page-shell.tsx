/**
 * Shared page furniture for the garage dashboard.
 *
 * `PageHeader` keeps the title/description rhythm identical across modules.
 * `ModulePlaceholder` marks a route that is reachable and permission-checked but
 * whose feature lands in a later milestone — it never fakes data.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ModulePlaceholder({
  icon: Icon,
  milestone,
  children,
}: {
  icon: LucideIcon;
  /** Which milestone delivers this module, so the gap is explicit. */
  milestone: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="max-w-md text-sm">{children}</p>
        <p className="text-muted-foreground text-xs">Dự kiến: {milestone}</p>
      </CardContent>
    </Card>
  );
}
