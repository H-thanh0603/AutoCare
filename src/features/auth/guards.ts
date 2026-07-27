/**
 * Page-level session guards.
 *
 * These redirect instead of throwing so an unauthenticated visitor lands on the
 * login form rather than an error page. They are a UX convenience layered on top
 * of the real authorization checks in the service and data-access layers — never
 * a substitute for them.
 */

import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import type { GarageRole } from "@/generated/prisma/enums";
import { isStaff, type Permission, type SessionUser, can } from "@/lib/rbac";

function loginRedirect(next: string): never {
  redirect(`/dang-nhap?tiep-tuc=${encodeURIComponent(next)}`);
}

/** Any authenticated user. */
export async function requireUserPage(next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) loginRedirect(next);
  return user;
}

export interface StaffPageContext {
  user: SessionUser;
  garageId: string;
  garageRole: GarageRole;
}

/**
 * A staff member with an active garage membership.
 *
 * `garageId` comes from the session so every downstream query is tenant-scoped
 * without the page ever reading an id from the URL or the client.
 */
export async function requireStaffPage(next: string): Promise<StaffPageContext> {
  const user = await requireUserPage(next);
  if (!isStaff(user)) {
    redirect("/tai-khoan");
  }
  if (!user.garageId || !user.garageRole) {
    redirect("/khong-co-quyen");
  }
  return { user, garageId: user.garageId, garageRole: user.garageRole };
}

/** Staff plus a specific permission; bounces to the dashboard when missing. */
export async function requireStaffPermissionPage(
  next: string,
  permission: Permission,
): Promise<StaffPageContext> {
  const context = await requireStaffPage(next);
  if (!can(context.user, permission)) {
    redirect("/khong-co-quyen");
  }
  return context;
}
