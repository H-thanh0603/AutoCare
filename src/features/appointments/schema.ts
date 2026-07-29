import { z } from "zod";

import { optionalText } from "@/lib/validation";

export const appointmentInputSchema = z.object({
  vehicleId: z.string().trim().min(1, "Vui lòng chọn xe."),
  scheduledAt: z.coerce.date(),
  serviceRequest: optionalText(500),
  note: optionalText(1_000),
});

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;
