import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  // 1. IP Rate Limiting
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimit({
    key: `ip:${ip}`,
    limit: 60, // 60 requests per minute
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

  const response = NextResponse.next();

  // 2. Security Headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  response.headers.set(
    'Content-Security-Policy',
    cspHeader.replace(/\s{2,}/g, ' ').trim()
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
