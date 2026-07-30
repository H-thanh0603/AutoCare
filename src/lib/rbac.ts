/**
 * Role-based access control primitives.
 *
 * Authorization is always evaluated on the server from the session, never from
 * client-supplied identifiers. UI-level hiding is cosmetic only.
 */

import { GarageRole, UserRole } from "@/generated/prisma/enums";
import { ForbiddenError, UnauthenticatedError } from "./errors";

/** Every garage-side role, ordered from narrowest to broadest scope. */
export const GARAGE_ROLES = [
  GarageRole.TECHNICIAN,
  GarageRole.CASHIER,
  GarageRole.RECEPTIONIST,
  GarageRole.GARAGE_MANAGER,
] as const;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Active garage membership, present only for staff users. */
  garageId: string | null;
  garageRole: GarageRole | null;
}

/**
 * Permissions are coarse-grained verbs on a domain area. Row-level checks
 * (e.g. "is this the technician assigned to the task?") live in each module's
 * `authorization.ts`, on top of these.
 */
export type Permission =
  | "customer:read"
  | "customer:write"
  | "vehicle:read"
  | "vehicle:write"
  | "appointment:read"
  | "appointment:write"
  | "appointment:confirm"
  | "media:read"
  | "media:write"
  | "garage-settings:write"
  | "repair-order:read"
  | "repair-order:write"
  | "repair-order:deliver"
  | "inspection:read"
  | "inspection:write"
  | "quotation:read"
  | "quotation:write"
  | "quotation:send"
  | "quotation:approve"
  | "work-task:read"
  | "work-task:write"
  | "work-task:assign"
  | "work-task:progress"
  | "quality-check:write"
  | "service:read"
  | "service:write"
  | "part:read"
  | "part:write"
  | "inventory:read"
  | "inventory:issue"
  | "inventory:adjust"
  | "invoice:read"
  | "invoice:write"
  | "payment:read"
  | "payment:write"
  | "vehicle-health:read"
  | "vehicle-health:write"
  | "share-link:manage"
  | "report:read"
  | "audit-log:read"
  | "garage-member:read"
  | "garage-member:write";

const TECHNICIAN_PERMISSIONS: readonly Permission[] = [
  "customer:read",
  "vehicle:read",
  "repair-order:read",
  "inspection:read",
  "inspection:write",
  "quotation:read",
  "work-task:read",
  "work-task:progress",
  "part:read",
  "inventory:read",
  "inventory:issue",
  "vehicle-health:read",
];

const CASHIER_PERMISSIONS: readonly Permission[] = [
  "customer:read",
  "vehicle:read",
  "repair-order:read",
  "repair-order:deliver",
  "quotation:read",
  "work-task:read",
  "invoice:read",
  "invoice:write",
  "payment:read",
  "payment:write",
  "vehicle-health:read",
];

const RECEPTIONIST_PERMISSIONS: readonly Permission[] = [
  "customer:read",
  "customer:write",
  "vehicle:read",
  "vehicle:write",
  "appointment:read",
  "appointment:write",
  "appointment:confirm",
  "media:read",
  "media:write",
  "repair-order:read",
  "repair-order:write",
  "repair-order:deliver",
  "inspection:read",
  "inspection:write",
  "quotation:read",
  "quotation:write",
  "quotation:send",
  "work-task:read",
  "service:read",
  "part:read",
  "inventory:read",
  "invoice:read",
  "payment:read",
  "vehicle-health:read",
  "vehicle-health:write",
  "share-link:manage",
];

/** The manager owns everything inside their own garage. */
const GARAGE_MANAGER_PERMISSIONS: readonly Permission[] = [
  ...new Set<Permission>([
    ...RECEPTIONIST_PERMISSIONS,
    ...TECHNICIAN_PERMISSIONS,
    ...CASHIER_PERMISSIONS,
    "inspection:write",
    "quotation:write",
    "work-task:write",
    "work-task:assign",
    "quality-check:write",
    "service:write",
    "part:write",
    "inventory:adjust",
    "invoice:write",
    "payment:write",
    "report:read",
    "audit-log:read",
    "garage-member:read",
    "garage-member:write",
    "garage-settings:write",
    "quotation:approve",
  ]),
];

/**
 * Customers act on their own vehicles only. Ownership is verified separately by
 * each module; this map just says which verbs are reachable at all.
 *
 * Note: share-link creation/revocation is staff-only (it is garage-scoped), so
 * it is intentionally NOT listed here — the customer-facing actions all resolve
 * a garage from the session.
 */
const CUSTOMER_PERMISSIONS: readonly Permission[] = [
  "vehicle:read",
  "vehicle:write",
  "appointment:read",
  "appointment:write",
  "repair-order:read",
  "inspection:read",
  "quotation:read",
  "quotation:approve",
  "work-task:read",
  "invoice:read",
  "payment:read",
  "vehicle-health:read",
];

const GARAGE_ROLE_PERMISSIONS: Record<GarageRole, readonly Permission[]> = {
  [GarageRole.TECHNICIAN]: TECHNICIAN_PERMISSIONS,
  [GarageRole.CASHIER]: CASHIER_PERMISSIONS,
  [GarageRole.RECEPTIONIST]: RECEPTIONIST_PERMISSIONS,
  [GarageRole.GARAGE_MANAGER]: GARAGE_MANAGER_PERMISSIONS,
};

/** Shared stable reference so a role with no permissions never allocates. */
const NO_PERMISSIONS: readonly Permission[] = [];

export function permissionsFor(user: SessionUser): readonly Permission[] {
  if (user.role === UserRole.CUSTOMER) {
    return CUSTOMER_PERMISSIONS;
  }
  if (user.role === UserRole.PLATFORM_ADMIN) {
    // Structure only in the MVP: no platform admin UI yet, but the role must
    // resolve to a defined permission set rather than an empty one.
    return GARAGE_MANAGER_PERMISSIONS;
  }
  return user.garageRole ? GARAGE_ROLE_PERMISSIONS[user.garageRole] : NO_PERMISSIONS;
}

/**
 * Set view of each permission list, built once per list and keyed by reference.
 * The lists are module constants, so this turns `can()` into an O(1) lookup
 * instead of scanning the array on every check.
 */
const permissionSetCache = new WeakMap<readonly Permission[], Set<Permission>>();

function permissionSetFor(user: SessionUser): Set<Permission> {
  const list = permissionsFor(user);
  let set = permissionSetCache.get(list);
  if (!set) {
    set = new Set(list);
    permissionSetCache.set(list, set);
  }
  return set;
}

export function can(user: SessionUser | null, permission: Permission): boolean {
  if (!user) return false;
  return permissionSetFor(user).has(permission);
}

export function requirePermission(
  user: SessionUser | null,
  permission: Permission,
): SessionUser {
  if (!user) {
    throw new UnauthenticatedError();
  }
  if (!can(user, permission)) {
    throw new ForbiddenError("Bạn không có quyền thực hiện thao tác này.");
  }
  return user;
}

export function isStaff(user: SessionUser | null): boolean {
  return user?.role === UserRole.STAFF || user?.role === UserRole.PLATFORM_ADMIN;
}

export function isCustomer(user: SessionUser | null): boolean {
  return user?.role === UserRole.CUSTOMER;
}

/**
 * Resolves the garage a staff request operates on. The garage always comes from
 * the session so a client cannot reach into another tenant by sending an id.
 */
export function requireGarageScope(user: SessionUser | null): {
  user: SessionUser;
  garageId: string;
} {
  if (!user) {
    throw new UnauthenticatedError();
  }
  if (!user.garageId) {
    throw new ForbiddenError("Tài khoản chưa được gán vào garage nào.");
  }
  return { user, garageId: user.garageId };
}

export function requireGarageRole(
  user: SessionUser | null,
  ...roles: GarageRole[]
): SessionUser {
  if (!user) {
    throw new UnauthenticatedError();
  }
  if (!user.garageRole || !roles.includes(user.garageRole)) {
    throw new ForbiddenError("Vai trò của bạn không được phép thực hiện thao tác này.");
  }
  return user;
}
