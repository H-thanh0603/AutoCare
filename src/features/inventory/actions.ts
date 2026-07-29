"use server";

import {
  CreatePartInput,
  adjustPartStock,
  createPart,
  issuePartForTask,
  receivePartStock,
  returnPartStock,
  updatePart,
} from "@/features/inventory/service";
import { getSessionUser } from "@/lib/auth";
import { runAction } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function createPartAction(input: Omit<CreatePartInput, "garageId" | "actorUserId">) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "part:write");
    const { garageId } = requireGarageScope(user);
    return createPart({
      ...input,
      garageId,
      actorUserId: user.id,
    });
  });
}

export async function updatePartAction(input: {
  partId: string;
  name?: string;
  unit?: string;
  costPrice?: number;
  sellPrice?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  version: number;
}) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "part:write");
    const { garageId } = requireGarageScope(user);
    return updatePart({
      ...input,
      garageId,
      actorUserId: user.id,
    });
  });
}

export async function issuePartAction(workTaskId: string, partId: string, quantity: number) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "inventory:issue");
    const { garageId } = requireGarageScope(user);
    return issuePartForTask({
      garageId,
      partId,
      workTaskId,
      quantity,
      actorUserId: user.id,
    });
  });
}

export async function receiveStockAction(partId: string, quantity: number, unitCost?: number, reason?: string) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "inventory:adjust");
    const { garageId } = requireGarageScope(user);
    return receivePartStock({
      garageId,
      partId,
      quantity,
      unitCost,
      reason,
      actorUserId: user.id,
    });
  });
}

export async function adjustStockAction(partId: string, newQuantity: number, reason: string) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "inventory:adjust");
    const { garageId } = requireGarageScope(user);
    return adjustPartStock({
      garageId,
      partId,
      newQuantity,
      reason,
      actorUserId: user.id,
    });
  });
}

export async function returnStockAction(partId: string, workTaskId: string, quantity: number, reason?: string) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "inventory:issue");
    const { garageId } = requireGarageScope(user);
    return returnPartStock({
      garageId,
      partId,
      workTaskId,
      quantity,
      reason,
      actorUserId: user.id,
    });
  });
}
