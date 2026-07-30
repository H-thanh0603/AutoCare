"use server";

/**
 * Authentication server actions.
 *
 * The action is the boundary layer only: it validates input, applies rate
 * limiting, and delegates the credential check to Auth.js. No business logic
 * lives here.
 */

import { AuthError } from "next-auth";
import { headers } from "next/headers";

import { findUserByEmail } from "@/data/users";
import { UserRole } from "@/generated/prisma/enums";
import { credentialsSchema, registerSchema } from "@/lib/auth-schema";
import { signIn, signOut } from "@/lib/auth";
import { runAction, ValidationError, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS, checkRateLimit, resetRateLimit, resolveClientIp } from "@/lib/rate-limit";
import { safeInternalPath } from "@/lib/utils";

import { registerCustomer } from "./service";

/** Best-effort client IP; behind a proxy this comes from `x-forwarded-for`. */
async function clientIp(): Promise<string> {
  const headerList = await headers();
  return resolveClientIp(headerList);
}

export interface LoginResultData {
  /** Where the browser should go next, decided server-side from the session. */
  redirectTo: string;
}

const INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng.";

/**
 * Verify credentials and open a session.
 *
 * Failure messages are intentionally identical for "no such account" and
 * "wrong password" so the response cannot be used to enumerate emails.
 */
export async function loginAction(
  formData: FormData,
): Promise<ActionResult<LoginResultData>> {
  return runAction(async () => {
    const parsed = credentialsSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      throw new ValidationError("Dữ liệu đăng nhập không hợp lệ.", fieldErrors);
    }

    const { email, password } = parsed.data;
    // Auth.js writes the session cookie to this response. `auth()` cannot read
    // that new cookie until the next request, so read the role before sign-in
    // for the server-decided destination.
    const account = await findUserByEmail(email);
    const rateKey = `login:${email}:${await clientIp()}`;
    const limit = await checkRateLimit({ key: rateKey, ...RATE_LIMITS.LOGIN });

    if (!limit.ok) {
      const minutes = Math.ceil(limit.retryAfterSeconds / 60);
      throw new ValidationError(
        `Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      );
    }

    try {
      // `redirect: false` keeps control here so the caller receives an
      // ActionResult instead of a thrown redirect.
      await signIn("credentials", { email, password, redirect: false });
    } catch (error) {
      if (error instanceof AuthError) {
        throw new ValidationError(INVALID_CREDENTIALS);
      }
      throw error;
    }

    await resetRateLimit(rateKey);

    // Destination comes from the account role, never from the form. The client
    // cannot steer itself into the dashboard, and this action need not read the
    // cookie that Auth.js has only just attached to its response. A validated
    // `next` (from the `tiep-tuc` param) takes precedence so the user returns to
    // the page they originally requested.
    const next = safeInternalPath(formData.get("next")?.toString());
    const roleHome =
      account?.role === UserRole.CUSTOMER ? "/tai-khoan" : "/bang-dieu-khien";
    return { redirectTo: next ?? roleHome };
  });
}

export interface RegisterResultData {
  redirectTo: string;
}

/**
 * Registers a customer account and signs them straight in.
 *
 * Validation runs again here because the client-side resolver is only a UX
 * affordance; this is the authoritative check.
 */
export async function registerAction(
  formData: FormData,
): Promise<ActionResult<RegisterResultData>> {
  return runAction(async () => {
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
      }
      throw new ValidationError("Dữ liệu đăng ký không hợp lệ.", fieldErrors);
    }

    const { name, email, phone, password } = parsed.data;

    const rateKey = `register:${await clientIp()}`;
    const limit = await checkRateLimit({ key: rateKey, ...RATE_LIMITS.REGISTER });
    if (!limit.ok) {
      const minutes = Math.ceil(limit.retryAfterSeconds / 60);
      throw new ValidationError(
        `Bạn đã tạo quá nhiều tài khoản. Vui lòng thử lại sau ${minutes} phút.`,
      );
    }

    await registerCustomer({ name, email, phone, password });

    // Sign in with the same credentials so the customer lands in the portal
    // instead of being bounced back to the login form.
    try {
      await signIn("credentials", { email, password, redirect: false });
    } catch (error) {
      if (error instanceof AuthError) {
        return { redirectTo: "/dang-nhap" };
      }
      throw error;
    }

    return { redirectTo: "/tai-khoan" };
  });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/dang-nhap" });
}
