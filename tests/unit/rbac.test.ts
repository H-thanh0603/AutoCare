import { describe, expect, it } from "vitest";

import { GarageRole, UserRole } from "@/generated/prisma/enums";
import { can, type SessionUser } from "@/lib/rbac";

const manager: SessionUser = {
  id: "manager-id",
  email: "manager@example.com",
  name: "Manager",
  role: UserRole.STAFF,
  garageId: "garage-id",
  garageRole: GarageRole.GARAGE_MANAGER,
};

const receptionist: SessionUser = {
  ...manager,
  id: "receptionist-id",
  garageRole: GarageRole.RECEPTIONIST,
};

describe("media and garage settings permissions", () => {
  it("allows manager to read and write media and garage settings", () => {
    expect(can(manager, "media:read")).toBe(true);
    expect(can(manager, "media:write")).toBe(true);
    expect(can(manager, "garage-settings:write")).toBe(true);
  });

  it("allows receptionist media access but not garage settings changes", () => {
    expect(can(receptionist, "media:read")).toBe(true);
    expect(can(receptionist, "media:write")).toBe(true);
    expect(can(receptionist, "garage-settings:write")).toBe(false);
  });
});
