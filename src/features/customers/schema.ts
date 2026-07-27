/**
 * Validation for customer input.
 *
 * The same schema runs in the browser (fast feedback) and in the server action
 * (the authority). `garageId` is deliberately absent: it comes from the session,
 * never from the form, so a client cannot write into another tenant.
 */

import { z } from "zod";

import { optionalEmailSchema, optionalText, phoneSchema } from "@/lib/validation";

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập tên khách hàng.")
    .max(120, "Tên quá dài."),
  phone: phoneSchema,
  email: optionalEmailSchema,
  address: optionalText(255),
  note: optionalText(1000),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/** Shape the form works with before Zod turns empty strings into `null`. */
export interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
}

export const CUSTOMER_FORM_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "note",
] as const satisfies readonly (keyof CustomerFormValues)[];
