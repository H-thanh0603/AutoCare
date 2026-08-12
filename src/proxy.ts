/**
 * Server-side proxy: security gate, security headers and access control.
 *
 * Enforces a nonce-based Content-Security-Policy plus the standard hardening
 * headers, checks route authorization, and protects staff/customer areas.
 * (Formerly `middleware.ts`; renamed to the Next.js 16 `proxy` convention.)
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

/**
 * Builds the CSP for a request.
 *
 * Production uses a per-request nonce with `strict-dynamic`, so no inline
 * script runs unless Next.js tagged it with this nonce — `'unsafe-inline'` is
 * gone for scripts. Development relaxes `script-src` because the dev server and
 * React Fast Refresh rely on inline and `eval`-based code. `style-src` keeps
 * `'unsafe-inline'` in both because Next/Tailwind inject inline styles and
 * style-injection is far lower risk than script injection.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { NextFetchEvent, NextRequest } from "next/server";

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

const authMiddleware = auth((request) => {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Forward the nonce and CSP on the *request* so Next.js stamps the nonce onto
  // the framework's own inline scripts; then also set CSP on the response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("content-security-policy", csp);

  const pass = () =>
    applySecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );

  const { pathname } = request.nextUrl;
  const isStaffArea = matches(pathname, STAFF_PREFIXES);
  const isCustomerArea = matches(pathname, CUSTOMER_PREFIXES);

  if (!isStaffArea && !isCustomerArea) {
    return pass();
  }

  const user = request.auth?.user;

  if (!user?.id) {
    const loginUrl = new URL("/dang-nhap", request.nextUrl);
    loginUrl.searchParams.set("tiep-tuc", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), csp);
  }

  if (isStaffArea && !isStaff(user)) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/tai-khoan", request.nextUrl)),
      csp,
    );
  }

  return pass();
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimit({
    key: `ip:${ip}`,
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return new NextResponse("Too Many Requests", { 
      status: 429,
      headers: {
        "Retry-After": rateLimitResult.retryAfterSeconds.toString()
      }
    });
  }

  // NextAuth types expect a specific request type, any bypasses compilation issues
  return (authMiddleware as any)(request, event);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
