import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getGarageAppointment,
  listGarageAppointments,
} from "@/data/appointments";
import { getCurrentPortalVehicleOwner } from "@/data/portal";
import {
  cancelCustomerAppointment,
  confirmAppointment,
  createCustomerAppointment,
  markAppointmentNoShow,
  rescheduleCustomerAppointment,
} from "@/features/appointments/service";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-appointments-${Date.now()}`;
const at9 = new Date("2030-01-02T02:00:00.000Z");
const at10 = new Date("2030-01-02T03:00:00.000Z");
const at11 = new Date("2030-01-02T04:00:00.000Z");
const at12 = new Date("2030-01-02T05:00:00.000Z");

let garageId: string;
let otherGarageId: string;
let userId: string;
let otherUserId: string;
let actorUserId: string;
let customerId: string;
let vehicleId: string;

beforeAll(async () => {
  const [garage, otherGarage] = await Promise.all([
    prisma.garage.create({ data: { name: `${PREFIX}-garage`, phone: "0900000000" } }),
    prisma.garage.create({ data: { name: `${PREFIX}-other`, phone: "0900000001" } }),
  ]);
  garageId = garage.id;
  otherGarageId = otherGarage.id;

  const [user, otherUser, actor] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${PREFIX}-customer@example.com`,
        passwordHash: "test-password-hash",
        name: "Khách kiểm thử",
      },
    }),
    prisma.user.create({
      data: {
        email: `${PREFIX}-other@example.com`,
        passwordHash: "test-password-hash",
        name: "Khách khác",
      },
    }),
    prisma.user.create({
      data: {
        email: `${PREFIX}-actor@example.com`,
        passwordHash: "test-password-hash",
        name: "Nhân viên kiểm thử",
        role: "STAFF",
      },
    }),
  ]);
  userId = user.id;
  otherUserId = otherUser.id;
  actorUserId = actor.id;

  const customer = await prisma.customer.create({
    data: { garageId, userId, name: "Khách hẹn kiểm thử", phone: PREFIX },
  });
  customerId = customer.id;
  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: PREFIX, brand: "Toyota", model: "Vios" },
  });
  vehicleId = vehicle.id;
  await prisma.vehicleOwnership.create({ data: { vehicleId, customerId } });
});

afterAll(async () => {
  if (!garageId || !otherGarageId) return;

  await prisma.auditLog.deleteMany({ where: { garageId: { in: [garageId, otherGarageId] } } });
  await prisma.appointment.deleteMany({ where: { garageId: { in: [garageId, otherGarageId] } } });
  if (vehicleId) await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  if (vehicleId) await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.garage.deleteMany({ where: { id: { in: [garageId, otherGarageId] } } });
  const userIds = [userId, otherUserId, actorUserId].filter((id): id is string => Boolean(id));
  if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("appointment services", () => {
  it("creates, confirms, cancels and exposes a garage-scoped appointment", async () => {
    const appointment = await createCustomerAppointment(userId, {
      vehicleId,
      scheduledAt: at9,
      serviceRequest: "Bảo dưỡng",
      note: null,
    });

    await confirmAppointment(garageId, actorUserId, appointment.id);
    await expect(getGarageAppointment(otherGarageId, appointment.id)).rejects.toBeInstanceOf(NotFoundError);
    await cancelCustomerAppointment(userId, appointment.id, "Đổi kế hoạch");

    await expect(getGarageAppointment(garageId, appointment.id)).resolves.toMatchObject({
      status: "CANCELLED",
      cancelledById: userId,
      cancelReason: "Đổi kế hoạch",
    });
  });

  it("marks a confirmed appointment as no-show within garage scope", async () => {
    const appointment = await createCustomerAppointment(userId, {
      vehicleId,
      scheduledAt: at11,
      serviceRequest: null,
      note: null,
    });
    await confirmAppointment(garageId, actorUserId, appointment.id);
    await markAppointmentNoShow(garageId, actorUserId, appointment.id);

    await expect(getGarageAppointment(garageId, appointment.id)).resolves.toMatchObject({
      status: "NO_SHOW",
    });
  });

  it("rejects an appointment for a vehicle whose current ownership ended", async () => {
    await prisma.vehicleOwnership.updateMany({
      where: { vehicleId, customerId, isCurrent: true },
      data: { isCurrent: false, endedAt: new Date() },
    });

    await expect(
      createCustomerAppointment(userId, {
        vehicleId,
        scheduledAt: at10,
        serviceRequest: null,
        note: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(getCurrentPortalVehicleOwner(userId, vehicleId)).rejects.toBeInstanceOf(NotFoundError);

    await prisma.vehicleOwnership.create({ data: { vehicleId, customerId } });
  });

  it("allows only one concurrent booking for an overlapping slot", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 2 }, () =>
        createCustomerAppointment(userId, {
          vehicleId,
          scheduledAt: at10,
          serviceRequest: null,
          note: null,
        }),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({ message: "Xe đã có lịch hẹn trùng thời gian." }),
      }),
    ]);
  });

  it("reschedules atomically by cancelling original and creating an audited replacement", async () => {
    const original = await createCustomerAppointment(userId, {
      vehicleId,
      scheduledAt: at11,
      serviceRequest: "Kiểm tra phanh",
      note: "Gấp",
    });

    const replacement = await rescheduleCustomerAppointment(userId, original.id, at12);
    const [oldAppointment, newAppointment, audits] = await Promise.all([
      getGarageAppointment(garageId, original.id),
      getGarageAppointment(garageId, replacement.id),
      prisma.auditLog.findMany({
        where: { garageId, entityId: { in: [original.id, replacement.id] } },
        select: { action: true, entityId: true },
      }),
    ]);

    expect(oldAppointment).toMatchObject({
      status: "CANCELLED",
      cancelledById: userId,
      cancelReason: "Đổi lịch hẹn",
    });
    expect(newAppointment).toMatchObject({
      status: "PENDING",
      scheduledAt: at12,
      serviceRequest: "Kiểm tra phanh",
      note: "Gấp",
    });
    expect(audits).toEqual(
      expect.arrayContaining([
        { action: "appointment.rescheduled", entityId: original.id },
        { action: "appointment.rescheduled", entityId: replacement.id },
      ]),
    );
  });

  it("only reschedules PENDING or CONFIRMED appointments", async () => {
    const appointment = await createCustomerAppointment(userId, {
      vehicleId,
      scheduledAt: at11,
      serviceRequest: null,
      note: null,
    });
    await cancelCustomerAppointment(userId, appointment.id, "Không đi được");

    await expect(rescheduleCustomerAppointment(userId, appointment.id, at9)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it("lists only appointments in garage date range and optional status", async () => {
    const appointments = await listGarageAppointments(
      garageId,
      { from: new Date("2030-01-02T00:00:00.000Z"), to: new Date("2030-01-03T00:00:00.000Z") },
      "PENDING",
    );

    expect(appointments).toEqual(
      expect.arrayContaining([expect.objectContaining({ garageId, status: "PENDING" })]),
    );
    expect(appointments.every((appointment) => appointment.status === "PENDING")).toBe(true);
  });
});
