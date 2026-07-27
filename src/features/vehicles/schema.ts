/**
 * Validation for vehicle input.
 *
 * License plates and VINs are normalised here rather than at the database layer so
 * that "51F-123.45" and "51f12345" cannot become two different vehicles. The plate
 * is deliberately not unique: plates are reassigned when a vehicle changes
 * province or owner, so the VIN is the stable identifier when it is known.
 */

import { z } from "zod";

import {
  MAX_MILEAGE_KM,
  mileageKmSchema,
  optionalNumber,
  optionalText,
} from "@/lib/validation";

/** Strips separators and spaces so plates compare consistently. */
export function normalizeLicensePlate(value: string): string {
  return value.toUpperCase().replace(/[\s.\-_]/g, "");
}

export const licensePlateSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập biển số.")
  .transform(normalizeLicensePlate)
  .refine((value) => value.length >= 5, "Biển số quá ngắn.")
  .refine((value) => value.length <= 15, "Biển số quá dài.")
  .refine(
    (value) => /^[A-Z0-9]+$/.test(value),
    "Biển số chỉ gồm chữ và số.",
  );

/**
 * VIN / số khung. The ISO standard is 17 characters excluding I, O and Q, but
 * older and imported vehicles carry shorter chassis numbers, so the lower bound is
 * relaxed while the ambiguous letters stay rejected.
 */
export const vinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null)
  .refine(
    (value) => value === null || (value.length >= 11 && value.length <= 17),
    "Số VIN/số khung phải từ 11 đến 17 ký tự.",
  )
  .refine(
    (value) => value === null || /^[A-HJ-NPR-Z0-9]+$/.test(value),
    "Số VIN/số khung không hợp lệ (không chứa I, O, Q).",
  );

const MIN_VEHICLE_YEAR = 1950;

/** Next year is allowed: dealers register model-year vehicles ahead of time. */
const maxVehicleYear = () => new Date().getFullYear() + 1;

export const vehicleYearSchema = optionalNumber(
  z.coerce
    .number()
    .int("Năm sản xuất phải là số nguyên.")
    .min(MIN_VEHICLE_YEAR, `Năm sản xuất phải từ ${MIN_VEHICLE_YEAR}.`)
    .refine((value) => value <= maxVehicleYear(), {
      error: () => `Năm sản xuất không được sau ${maxVehicleYear()}.`,
    }),
);

export const vehicleSchema = z.object({
  licensePlate: licensePlateSchema,
  vin: vinSchema,
  brand: z.string().trim().min(1, "Vui lòng nhập hãng xe.").max(60, "Tên hãng quá dài."),
  model: z.string().trim().min(1, "Vui lòng nhập dòng xe.").max(60, "Tên dòng xe quá dài."),
  year: vehicleYearSchema,
  color: optionalText(40),
  engineNumber: optionalText(60),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

/**
 * Creating a vehicle also opens its first ownership, so the owner is required.
 * A vehicle with no owner would be invisible to every garage-scoped query.
 */
export const createVehicleSchema = vehicleSchema.extend({
  customerId: z.string().trim().min(1, "Vui lòng chọn chủ sở hữu."),
  currentKm: optionalNumber(mileageKmSchema),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const mileageSchema = z.object({
  mileageKm: mileageKmSchema,
  note: optionalText(255),
  /**
   * Required only when the new reading is lower than the current one. The rule
   * itself lives in the service layer because it needs the stored value.
   */
  overrideReason: optionalText(255).refine(
    (value) => value === null || value.length >= 10,
    "Lý do cần ít nhất 10 ký tự.",
  ),
});

export type MileageInput = z.infer<typeof mileageSchema>;

export const transferOwnershipSchema = z.object({
  customerId: z.string().trim().min(1, "Vui lòng chọn chủ sở hữu mới."),
  note: optionalText(255),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export { MAX_MILEAGE_KM };

/** Shape the forms bind to, before Zod coerces and nulls empty strings. */
export interface VehicleFormValues {
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  engineNumber: string;
}

export const VEHICLE_FORM_FIELDS = [
  "licensePlate",
  "vin",
  "brand",
  "model",
  "year",
  "color",
  "engineNumber",
] as const satisfies readonly (keyof VehicleFormValues)[];
