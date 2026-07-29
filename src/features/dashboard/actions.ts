"use server";

import {
  getDashboardMetrics,
  getInventoryReport,
  getRevenueReport,
  getServiceReport,
  getTechnicianReport,
} from "@/features/dashboard/reports-service";
import { getSessionUser } from "@/lib/auth";
import { runAction } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function getDashboardMetricsAction() {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "report:read");
    const { garageId } = requireGarageScope(user);
    return getDashboardMetrics(garageId);
  });
}

export async function getRevenueReportAction(startDate?: Date, endDate?: Date) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "report:read");
    const { garageId } = requireGarageScope(user);
    return getRevenueReport(garageId, startDate, endDate);
  });
}

export async function getServiceReportAction(startDate?: Date, endDate?: Date) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "report:read");
    const { garageId } = requireGarageScope(user);
    return getServiceReport(garageId, startDate, endDate);
  });
}

export async function getTechnicianReportAction(startDate?: Date, endDate?: Date) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "report:read");
    const { garageId } = requireGarageScope(user);
    return getTechnicianReport(garageId, startDate, endDate);
  });
}

export async function getInventoryReportAction() {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "report:read");
    const { garageId } = requireGarageScope(user);
    return getInventoryReport(garageId);
  });
}
