/**
 * Validation primitives shared by several modules.
 *
 * These live outside any feature folder because the same rules apply wherever the
 * data enters the system: a phone number typed into the registration form and one
 * typed into the garage's customer form must be accepted or rejected identically.
 */

import { z } from "zod";

/** Vietnamese mobile numbers: 10 digits starting with 0, or the +84 form. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(0\d{9}|\+84\d{9})$/, "Số điện thoại không hợp lệ.");

/**
 * An optional free-text field.
 *
 * An empty input means "not provided", so it becomes `null` rather than `""`.
 * Storing both would give two representations of the same absence.
 */
export function optionalText(max: number, message?: string) {
  return z
    .string()
    .trim()
    .max(max, message ?? `Tối đa ${max} ký tự.`)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null);
}

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null)
  .refine(
    (value) => value === null || z.string().email().safeParse(value).success,
    "Email không hợp lệ.",
  );

/**
 * Odometer readings. The upper bound is a sanity check against typos (a car with
 * two million km is implausible), not a business limit.
 */
export const MAX_MILEAGE_KM = 2_000_000;

export const mileageKmSchema = z.coerce
  .number()
  .int("Số km phải là số nguyên.")
  .min(0, "Số km không được âm.")
  .max(MAX_MILEAGE_KM, "Số km vượt quá giới hạn hợp lệ.");

/** Reads an optional numeric form field, treating "" as absent. */
export function optionalNumber(schema: z.ZodType<number>) {
  return z
    .union([z.literal(""), z.null(), z.undefined(), schema])
    .transform((value) =>
      value === "" || value === null || value === undefined ? null : value,
    );
}
