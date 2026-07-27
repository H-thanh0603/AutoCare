/**
 * Validation schemas for authentication input.
 *
 * Kept separate from `auth.ts` so client components can import them without
 * pulling in Prisma or the Auth.js server runtime.
 */

import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

/** Vietnamese mobile numbers: 10 digits starting with 0, or +84 form. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(0\d{9}|\+84\d{9})$/, "Số điện thoại không hợp lệ.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Vui lòng nhập họ tên.").max(120),
    email: z.string().trim().toLowerCase().email("Email không hợp lệ."),
    phone: phoneSchema,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`)
      .max(72, "Mật khẩu quá dài.")
      .regex(/[a-zA-Z]/, "Mật khẩu cần có chữ cái.")
      .regex(/\d/, "Mật khẩu cần có số."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại không khớp.",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
