/**
 * Server-side proxy: security gate, security headers, rate limiting and access control.
 *
 * Enforces a nonce-based Content-Security-Policy plus standard hardening headers,
 * IP rate limiting, checks route authorization, and protects staff/customer areas.
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";
import { isStaff } from "@/lib/rbac";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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
    "connect-src 'self' https: http: ws: wss:",
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

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export default auth(async (request) => {
  // 1. IP Rate Limiting
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
        "Retry-After": rateLimitResult.retryAfterSeconds.toString(),
      },
    });
  }

  // 2. CSP & Security Nonce
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
