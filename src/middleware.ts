/**
 * Coarse edge gate for authenticated areas.
 *
 * This is NOT the authorization layer — every server action, route handler and
 * data-access function still enforces permissions and garage scope server-side.
 * The middleware only avoids rendering a private shell for a visitor who has no
 * session at all, and keeps customers out of the staff dashboard.
 *
 * It imports `@/lib/auth.config` (no Prisma, no bcrypt) so it stays edge-safe.
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";
import { isStaff } from "@/lib/rbac";

const { auth } = NextAuth(authConfig);

/** Areas only a signed-in customer (or staff) may open. */
const CUSTOMER_PREFIXES = ["/tai-khoan"] as const;

/** Areas that require a staff/admin account. */
const STAFF_PREFIXES = [
  "/bang-dieu-khien",
  "/lenh-sua-chua",
  "/khach-hang",
  "/xe",
  "/bao-gia",
  "/cong-viec",
  "/kho",
  "/hoa-don",
  "/lich-hen",
  "/cai-dat",
] as const;

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isStaffArea = matches(pathname, STAFF_PREFIXES);
  const isCustomerArea = matches(pathname, CUSTOMER_PREFIXES);

  if (!isStaffArea && !isCustomerArea) return NextResponse.next();

  const user = request.auth?.user;

  if (!user?.id) {
    const loginUrl = new URL("/dang-nhap", request.nextUrl);
    loginUrl.searchParams.set("tiep-tuc", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isStaffArea && !isStaff(user)) {
    return NextResponse.redirect(new URL("/tai-khoan", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
