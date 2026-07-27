/**
 * Garage dashboard navigation.
 *
 * Each entry declares the permission that makes it reachable, so the sidebar is
 * derived from the same permission map the server enforces. Hiding a link is
 * cosmetic: the target page still guards itself.
 */

import {
  Banknote,
  Calendar,
  Car,
  Gauge,
  ListChecks,
  Package,
  Receipt,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { Permission, SessionUser } from "@/lib/rbac";
import { can } from "@/lib/rbac";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
}

export const DASHBOARD_NAV: readonly NavItem[] = [
  {
    href: "/bang-dieu-khien",
    label: "Tổng quan",
    icon: Gauge,
    permission: "repair-order:read",
  },
  {
    href: "/lich-hen",
    label: "Lịch hẹn",
    icon: Calendar,
    permission: "appointment:read",
  },
  {
    href: "/lenh-sua-chua",
    label: "Lệnh sửa chữa",
    icon: Wrench,
    permission: "repair-order:read",
  },
  { href: "/bao-gia", label: "Báo giá", icon: Receipt, permission: "quotation:read" },
  {
    href: "/cong-viec",
    label: "Công việc",
    icon: ListChecks,
    permission: "work-task:read",
  },
  {
    href: "/khach-hang",
    label: "Khách hàng",
    icon: Users,
    permission: "customer:read",
  },
  { href: "/xe", label: "Xe", icon: Car, permission: "vehicle:read" },
  {
    href: "/kho",
    label: "Kho phụ tùng",
    icon: Package,
    permission: "inventory:read",
  },
  { href: "/hoa-don", label: "Hóa đơn", icon: Banknote, permission: "invoice:read" },
  {
    href: "/cai-dat",
    label: "Cài đặt",
    icon: Settings,
    permission: "garage-member:read",
  },
] as const;

/** The subset of the menu this user can actually open. */
export function navFor(user: SessionUser): readonly NavItem[] {
  return DASHBOARD_NAV.filter((item) => can(user, item.permission));
}

const GARAGE_ROLE_LABELS = {
  RECEPTIONIST: "Lễ tân",
  TECHNICIAN: "Kỹ thuật viên",
  CASHIER: "Thu ngân",
  GARAGE_MANAGER: "Quản lý gara",
} as const;

export function garageRoleLabel(role: keyof typeof GARAGE_ROLE_LABELS): string {
  return GARAGE_ROLE_LABELS[role];
}
