/**
 * Authentication (Auth.js v5, credentials provider).
 *
 * The JWT session carries the active garage membership so authorization never
 * has to trust a client-supplied garageId. Membership is re-read on sign-in and
 * whenever the session is refreshed with `trigger === "update"`.
 *
 * This module touches Prisma and bcrypt, so it runs on Node only. The edge
 * middleware uses `./auth.config.ts` instead.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { asNullableString, authConfig } from "./auth.config";
import { credentialsSchema } from "./auth-schema";
import { verifyPassword } from "./password";
import { prisma } from "./prisma";
import type { SessionUser } from "./rbac";

/**
 * Loads the user plus their active garage membership.
 *
 * A staff user with several memberships gets the most recently created active
 * one; garage switching is out of scope for the MVP.
 */
async function loadAuthUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      memberships: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { garageId: true, role: true },
      },
    },
  });
}

/**
 * Re-reads the mutable authorization claims for a user: platform role, active
 * garage membership, and whether the account is still active.
 *
 * Returns null when the account has been deactivated or removed, so the caller
 * can invalidate the session instead of trusting stale claims.
 */
async function reloadClaims(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      role: true,
      memberships: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { garageId: true, role: true },
      },
    },
  });
  if (!user) return null;
  const membership = user.memberships[0];
  return {
    role: user.role,
    garageId: membership?.garageId ?? null,
    garageRole: membership?.role ?? null,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await loadAuthUser(parsed.data.email);
        // Compare against a dummy hash when the user is missing so that a
        // non-existent account and a wrong password take similar time.
        const hash =
          user?.passwordHash ??
          "$2b$12$0000000000000000000000000000000000000000000000000000";
        const ok = await verifyPassword(parsed.data.password, hash);
        if (!user || !ok) return null;

        const membership = user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          garageId: membership?.garageId ?? null,
          garageRole: membership?.role ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      const claims = token as Record<string, unknown>;

      if (user) {
        claims["sub"] = user.id;
        claims["role"] = user.role;
        claims["garageId"] = user.garageId;
        claims["garageRole"] = user.garageRole;
        return token;
      }

      const userId = asNullableString(claims["sub"]);
      if (trigger === "update" && userId) {
        const fresh = await reloadClaims(userId);
        if (!fresh) {
          // Account deactivated or removed: blank the subject so the session
          // resolves as unauthenticated on the next request.
          claims["sub"] = "";
          return token;
        }
        claims["role"] = fresh.role;
        claims["garageId"] = fresh.garageId;
        claims["garageRole"] = fresh.garageRole;
      }

      return token;
    },
  },
});

/** Current session user, or null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    const { id, email, name, role, garageId, garageRole } = session.user;

    // Enforce account status on every request. With a JWT session the token is
    // valid until it expires, so without this check a user deactivated mid-
    // session would keep access for up to SESSION_MAX_AGE_SECONDS. One indexed
    // primary-key lookup is the cost of immediate revocation.
    const active = await prisma.user.findFirst({
      where: { id, isActive: true },
      select: { id: true },
    });
    if (!active) return null;

    return { id, email, name, role, garageId, garageRole };
  } catch {
    // If the session cookie is invalid, corrupted, or stale, fail gracefully as unauthenticated
    return null;
  }
}
