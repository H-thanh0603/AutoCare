import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const inspectionItemSchema = z.object({
  id: z.string().cuid().optional(),
  category: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  severity: z.enum(["OK", "ATTENTION", "URGENT"]),
  finding: optionalText(2_000),
  recommendation: optionalText(2_000),
});

export const inspectionSchema = z.object({
  summary: optionalText(2_000),
  items: z.array(inspectionItemSchema).min(1).max(50),
});

export type InspectionInput = z.infer<typeof inspectionSchema>;
