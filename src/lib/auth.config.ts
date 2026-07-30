/**
 * Edge-safe half of the Auth.js configuration.
 *
 * This module must stay free of Prisma, bcrypt and any Node-only dependency so
 * `src/middleware.ts` can read the session cookie in the edge runtime. The
 * credentials provider and every database lookup live in `./auth.ts`.
 */

import type { NextAuthConfig } from "next-auth";

import type { GarageRole, UserRole } from "@/generated/prisma/enums";

import type { SessionUser } from "./rbac";

declare module "next-auth" {
  interface Session {
    user: SessionUser & { emailVerified: Date | null };
  }

  interface User {
    role: UserRole;
    garageId: string | null;
    garageRole: GarageRole | null;
  }
}

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * Resolves the JWT signing secret.
 *
 * A predictable fallback would let anyone forge a session, so production must
 * fail closed when `AUTH_SECRET` is missing. A clearly-marked dev-only value is
 * used outside production so local runs and tests still work.
 */
function resolveAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }
  return "autocare-dev-only-insecure-secret";
}

/**
 * The JWT type in next-auth v5 is re-exported from `@auth/core/jwt` and cannot
 * be module-augmented reliably, so custom claims are read back through these
 * narrowing helpers instead of being declared on the interface.
 */
export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function asUserRole(value: unknown): UserRole {
  return value === "STAFF" || value === "PLATFORM_ADMIN" || value === "CUSTOMER"
    ? value
    : "CUSTOMER";
}

export function asGarageRole(value: unknown): GarageRole | null {
  return value === "RECEPTIONIST" ||
    value === "TECHNICIAN" ||
    value === "CASHIER" ||
    value === "GARAGE_MANAGER"
    ? value
    : null;
}

/**
 * Base config shared by the edge middleware and the full Node-side instance.
 *
 * The `jwt` callback here only copies claims that are already available on the
 * signed-in user object; refreshing membership from the database happens in the
 * Node-side override in `./auth.ts`.
 */
export const authConfig = {
  secret: resolveAuthSecret(),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/dang-nhap" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      const claims = token as Record<string, unknown>;
      if (user) {
        claims["sub"] = user.id;
        claims["role"] = user.role;
        claims["garageId"] = user.garageId;
        claims["garageRole"] = user.garageRole;
      }
      return token;
    },
    session({ session, token }) {
      const claims = token as Record<string, unknown>;
      session.user = {
        id: asString(claims["sub"]),
        email: asString(claims["email"]),
        name: asString(claims["name"]),
        role: asUserRole(claims["role"]),
        garageId: asNullableString(claims["garageId"]),
        garageRole: asGarageRole(claims["garageRole"]),
        emailVerified: null,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
