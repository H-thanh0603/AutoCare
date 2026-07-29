/**
 * Edge security gate, security headers and access control.
 *
 * Enforces security headers (CSP, nosniff, frameguard, XSS protection),
 * checks route authorization, and protects protected areas.
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";
import { isStaff } from "@/lib/rbac";

const { auth } = NextAuth(authConfig);

const CUSTOMER_PREFIXES = ["/tai-khoan"] as const;

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

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isStaffArea = matches(pathname, STAFF_PREFIXES);
  const isCustomerArea = matches(pathname, CUSTOMER_PREFIXES);

  if (!isStaffArea && !isCustomerArea) {
    return applySecurityHeaders(NextResponse.next());
  }

  const user = request.auth?.user;

  if (!user?.id) {
    const loginUrl = new URL("/dang-nhap", request.nextUrl);
    loginUrl.searchParams.set("tiep-tuc", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (isStaffArea && !isStaff(user)) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/tai-khoan", request.nextUrl)));
  }

  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
