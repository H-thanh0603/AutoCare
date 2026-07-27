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

import { credentialsSchema, registerSchema } from "@/lib/auth-schema";
import { getSessionUser, signIn, signOut } from "@/lib/auth";
import { runAction, ValidationError, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS, checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { isStaff } from "@/lib/rbac";

import { registerCustomer } from "./service";

/** Best-effort client IP; behind a proxy this comes from `x-forwarded-for`. */
async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip") ?? "unknown";
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
    const rateKey = `login:${email}:${await clientIp()}`;
    const limit = checkRateLimit({ key: rateKey, ...RATE_LIMITS.LOGIN });

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

    resetRateLimit(rateKey);

    // Destination comes from the freshly issued session, never from the form,
    // so a client cannot steer itself into the dashboard.
    const user = await getSessionUser();
    if (!user) {
      throw new ValidationError(INVALID_CREDENTIALS);
    }

    return { redirectTo: isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan" };
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
    const limit = checkRateLimit({ key: rateKey, ...RATE_LIMITS.REGISTER });
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
