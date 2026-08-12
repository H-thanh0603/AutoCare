import { Prisma } from "@/generated/prisma/client";
import { recordAudit, type AuditAction } from "./audit";

/**
 * Tạo một extension cho Prisma Client để tự động ghi log khi có thao tác update/delete
 * với các model quan trọng.
 */
export function withAuditExtension(
  actorUserId?: string | null,
  garageId?: string | null
) {
  return Prisma.defineExtension({
    name: "audit-extension",
    query: {
      $allModels: {
        async create({ model, _operation, args, query }) {
          const result = await query(args);
          const resObj = result as Record<string, unknown>;
          await recordAudit({
            action: `${model.toLowerCase()}.created` as AuditAction,
            entityType: model,
            entityId: String(resObj.id),
            garageId: garageId ?? (resObj.garageId as string | undefined),
            actorUserId,
            after: result,
          });
          return result;
        },
        async update({ model, _operation, args, query }) {
          const result = await query(args);
          const resObj = result as Record<string, unknown>;
          await recordAudit({
            action: `${model.toLowerCase()}.updated` as AuditAction,
            entityType: model,
            entityId: String(resObj.id),
            garageId: garageId ?? (resObj.garageId as string | undefined),
            actorUserId,
            after: result,
          });
          return result;
        },
        async delete({ model, _operation, args, query }) {
          const result = await query(args);
          const resObj = result as Record<string, unknown>;
          await recordAudit({
            action: `${model.toLowerCase()}.deleted` as AuditAction,
            entityType: model,
            entityId: String(resObj.id),
            garageId: garageId ?? (resObj.garageId as string | undefined),
            actorUserId,
            before: result,
          });
          return result;
        },
      },
    },
  });
}
