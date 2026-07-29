import { z } from "zod";

import { mileageKmSchema, optionalNumber, optionalText } from "@/lib/validation";

export const receptionSchema = z.object({
  mileageKm: mileageKmSchema,
  fuelLevel: optionalNumber(z.coerce.number().int().min(0).max(100)),
  initialNote: optionalText(2_000),
  intakeChecklist: z.record(z.string(), z.boolean()).default({}),
  overrideReason: optionalText(255).refine(
    (value) => value === null || value.length >= 10,
    "Lý do cần ít nhất 10 ký tự.",
  ),
});

export type ReceptionInput = z.infer<typeof receptionSchema>;
