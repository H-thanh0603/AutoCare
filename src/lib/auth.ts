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
  return prisma.user.findFirst({
    where: { email, isActive: true },
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

async function loadMembership(userId: string) {
  const membership = await prisma.garageMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { garageId: true, role: true },
  });
  return {
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
        const membership = await loadMembership(userId);
        claims["garageId"] = membership.garageId;
        claims["garageRole"] = membership.garageRole;
      }

      return token;
    },
  },
});

/** Current session user, or null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { id, email, name, role, garageId, garageRole } = session.user;
  return { id, email, name, role, garageId, garageRole };
}
