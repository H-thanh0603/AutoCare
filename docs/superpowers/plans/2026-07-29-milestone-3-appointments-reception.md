# Mốc 3 — Lịch hẹn và tiếp nhận Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customer đặt lịch cho xe của họ; garage xác nhận và tiếp nhận thành repair order, gồm cấu hình lịch làm việc, mileage, checklist và media riêng tư trên AWS S3.

**Architecture:** Giữ pattern `src/data/*` (Prisma access), `src/features/*` (Zod, service, actions, UI), RSC pages và Route Handler cho binary upload. Appointment lưu `endsAt` do server tính từ `Garage.settings`; PostgreSQL exclusion constraint chặn race overlap. Check-in, code repair order, mileage và audit cùng Prisma transaction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Auth.js, Zod, React Hook Form, AWS SDK v3, Vitest, Playwright.

## Global Constraints

- `docs/WORKFLOWS.md` là nguồn thật cho state transition; `ARRIVED` không được hủy.
- Scope garage lấy từ session; foreign garage ID trả `NotFoundError`.
- Customer ownership phải kiểm tra qua `Customer.userId` và `VehicleOwnership.isCurrent`; không tin ID client.
- S3 bucket private; không public URL; AWS credentials không dùng `NEXT_PUBLIC_*`.
- Upload chỉ JPEG/PNG/WEBP/PDF, ≤10 MB; server kiểm tra parent, key, object size và file signature.
- Không thêm calendar, drag/drop, cache hay upload dependency ngoài `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`.
- Mọi money giữ `Int` VND; mọi mutation nhạy cảm ghi audit trong transaction.
- Mỗi task: RED → GREEN → lint/typecheck/test liên quan → review gate. Không commit nếu user chưa yêu cầu.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | `Appointment.endsAt`, `RepairOrder.intakeChecklist`, sequence và media constraints. |
| `src/lib/appointment-settings.ts` | Typed default/parse/validate working hours và slot availability. |
| `src/data/appointments.ts` | Garage/customer-scoped appointment queries and writes. |
| `src/features/appointments/*` | Appointment validation, service, actions, booking/calendar/settings UI. |
| `src/features/repair-orders/*` | Reception validation, atomic check-in/walk-in service, form. |
| `src/features/media/*` | Media input validation, S3 authorization/presign/complete, uploader. |
| `src/lib/s3.ts` | Server-only S3 client plus short-lived URL helpers. |
| `src/app/api/media/**/route.ts` | Authorized presign, complete, download endpoints. |
| `src/app/(dashboard)/lich-hen/page.tsx` | Garage appointment schedule. |
| `src/app/(dashboard)/lenh-sua-chua/[id]/page.tsx` | Repair order intake detail. |
| `src/app/tai-khoan/lich-hen/**` | Customer booking/detail pages. |

### Task 1: Persist appointment ranges and intake state

**Files:**
- Modify: `prisma/schema.prisma:357-421,833-856`
- Create: `prisma/migrations/<timestamp>_milestone_3_appointments_reception/migration.sql`
- Modify: `prisma/seed.ts:87-106`
- Test: `tests/integration/appointments.test.ts`

**Interfaces:**
- Produces `Appointment.endsAt: DateTime`, `RepairOrder.intakeChecklist: Json?`, `RepairOrderSequence`.
- Produces PostgreSQL exclusion constraint named `appointments_open_vehicle_time_no_overlap`.

- [ ] **Step 1: Write failing integration test for overlap persisted in PostgreSQL**

```ts
it("rejects overlapping PENDING appointments for one vehicle", async () => {
  await prisma.appointment.create({ data: { ...base, scheduledAt: at9, endsAt: at10 } });
  await expect(prisma.appointment.create({
    data: { ...base, scheduledAt: at930, endsAt: at1030 },
  })).rejects.toMatchObject({ code: "23P01" });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm test:integration -- tests/integration/appointments.test.ts`  
Expected: FAIL because `endsAt` and constraint do not exist.

- [ ] **Step 3: Add schema fields and sequence model**

```prisma
model Appointment {
  // Existing fields
  scheduledAt DateTime
  endsAt      DateTime
  // Existing relations/indexes
  @@index([garageId, scheduledAt])
  @@index([vehicleId, status])
}

model RepairOrder {
  // Existing fields
  intakeChecklist Json?
}

model RepairOrderSequence {
  id        String @id @default(cuid())
  garageId  String
  year      Int
  nextValue Int    @default(1)
  garage    Garage @relation(fields: [garageId], references: [id])

  @@unique([garageId, year])
  @@map("repair_order_sequences")
}

model Media {
  storageKey String @unique
}
```

- [ ] **Step 4: Write migration SQL with database invariants**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD COLUMN "endsAt" TIMESTAMPTZ;
UPDATE "appointments" SET "endsAt" = "scheduledAt" + INTERVAL '1 hour' WHERE "endsAt" IS NULL;
ALTER TABLE "appointments" ALTER COLUMN "endsAt" SET NOT NULL;
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_valid_range" CHECK ("endsAt" > "scheduledAt"),
  ADD CONSTRAINT "appointments_open_vehicle_time_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("scheduledAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "repair_orders" ADD COLUMN "intakeChecklist" JSONB;
CREATE TABLE "repair_order_sequences" (
  "id" TEXT PRIMARY KEY,
  "garageId" TEXT NOT NULL REFERENCES "garages"("id"),
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  UNIQUE ("garageId", "year")
);
CREATE UNIQUE INDEX "media_storageKey_key" ON "media"("storageKey");
```

- [ ] **Step 5: Seed typed schedule default**

```ts
settings: {
  allowNegativeStock: false,
  taxPercent: 8,
  appointmentSlotMinutes: 60,
  workingHours: {
    1: { open: "08:00", close: "17:00" },
    2: { open: "08:00", close: "17:00" },
    3: { open: "08:00", close: "17:00" },
    4: { open: "08:00", close: "17:00" },
    5: { open: "08:00", close: "17:00" },
    6: { open: "08:00", close: "17:00" },
  },
},
```

- [ ] **Step 6: Generate and verify GREEN**

Run: `pnpm db:generate && pnpm db:migrate && pnpm test:integration -- tests/integration/appointments.test.ts`  
Expected: migration applies; overlap test passes.

### Task 2: Lock shared state, RBAC and appointment settings

**Files:**
- Modify: `src/lib/transitions.ts:24-53`
- Modify: `src/lib/rbac.ts:34-178`
- Modify: `src/lib/audit.ts:13-36`
- Create: `src/lib/appointment-settings.ts`
- Modify: `src/data/garages.ts:12-44`
- Test: `tests/unit/transitions.test.ts`, `tests/unit/appointment-settings.test.ts`

**Interfaces:**
- Produces `parseAppointmentSettings(value: unknown): AppointmentSettings`.
- Produces `assertAppointmentSlot(settings, scheduledAt): Date`.
- Produces permissions `media:read`, `media:write`, `garage-settings:write`.

- [ ] **Step 1: Write RED tests**

```ts
expect(() => assertAppointmentTransition("ARRIVED", "CANCELLED")).toThrow(BusinessRuleError);
expect(() => assertAppointmentSlot(DEFAULT_APPOINTMENT_SETTINGS, sundayAt9)).toThrow(
  "Gara không làm việc vào thời điểm đã chọn.",
);
expect(can(manager, "garage-settings:write")).toBe(true);
expect(can(receptionist, "garage-settings:write")).toBe(false);
```

- [ ] **Step 2: Implement pure settings contract**

```ts
export interface WorkingHours { open: string; close: string }
export interface AppointmentSettings {
  appointmentSlotMinutes: number;
  workingHours: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, WorkingHours>>;
}

export const DEFAULT_APPOINTMENT_SETTINGS: AppointmentSettings = {
  appointmentSlotMinutes: 60,
  workingHours: { 1: { open: "08:00", close: "17:00" }, 2: { open: "08:00", close: "17:00" }, 3: { open: "08:00", close: "17:00" }, 4: { open: "08:00", close: "17:00" }, 5: { open: "08:00", close: "17:00" }, 6: { open: "08:00", close: "17:00" } },
};

export function assertAppointmentSlot(settings: AppointmentSettings, scheduledAt: Date): Date {
  // Convert to Asia/Ho_Chi_Minh calendar values, assert day/range/alignment, return endsAt.
}
```

- [ ] **Step 3: Apply policy corrections**

```ts
export const APPOINTMENT_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["COMPLETED"],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [],
} satisfies TransitionMap<AppointmentStatus>;
```

Add audit constants: `APPOINTMENT_STATUS_CHANGED`, `APPOINTMENT_RESCHEDULED`, `REPAIR_ORDER_RECEIVED`, `REPAIR_ORDER_WALK_IN`, `MEDIA_UPLOADED`.

- [ ] **Step 4: Make garage settings typed at data boundary**

```ts
export interface GarageProfile extends /* existing fields */ {
  appointmentSettings: AppointmentSettings;
}

export async function updateGarageAppointmentSettings(
  garageId: string,
  settings: AppointmentSettings,
): Promise<void> {
  // Fetch settings, retain allowNegativeStock/taxPercent, replace only appointment keys.
}
```

- [ ] **Step 5: Run GREEN checks**

Run: `pnpm test -- tests/unit/transitions.test.ts tests/unit/appointment-settings.test.ts && pnpm typecheck`  
Expected: PASS.

### Task 3: Add appointment repositories and domain service

**Files:**
- Create: `src/data/appointments.ts`
- Modify: `src/data/portal.ts:14-100`
- Create: `src/features/appointments/schema.ts`
- Create: `src/features/appointments/service.ts`
- Test: `tests/unit/appointments.test.ts`, `tests/integration/appointments.test.ts`

**Interfaces:**
- Produces `createCustomerAppointment(userId, input): Promise<{ id: string }>`.
- Produces `confirmAppointment(garageId, actorId, appointmentId): Promise<void>`.
- Produces `cancelCustomerAppointment(userId, appointmentId, reason): Promise<void>`.
- Produces `rescheduleCustomerAppointment(userId, appointmentId, scheduledAt): Promise<{ id: string }>`.

- [ ] **Step 1: Define Zod input and RED service tests**

```ts
export const appointmentInputSchema = z.object({
  vehicleId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  serviceRequest: optionalText(500),
  note: optionalText(1_000),
});

it("rejects customer booking for a vehicle no longer owned", async () => {
  await expect(createCustomerAppointment(previousOwnerUserId, input)).rejects.toBeInstanceOf(NotFoundError);
});
```

- [ ] **Step 2: Implement scoped repository methods**

```ts
export async function getGarageAppointment(garageId: string, id: string, db = prisma): Promise<GarageAppointment> {
  const appointment = await db.appointment.findFirst({ where: { id, garageId }, select: appointmentSelect });
  if (!appointment) throw new NotFoundError("Không tìm thấy lịch hẹn.");
  return appointment;
}

export async function listGarageAppointments(garageId: string, range: { from: Date; to: Date }, status?: AppointmentStatus): Promise<GarageAppointment[]> {
  return prisma.appointment.findMany({ where: { garageId, scheduledAt: { gte: range.from, lt: range.to }, ...(status ? { status } : {}) }, select: appointmentSelect, orderBy: { scheduledAt: "asc" } });
}
```

- [ ] **Step 3: Implement service rules and conflict mapping**

```ts
export async function createCustomerAppointment(userId: string, input: AppointmentInput): Promise<{ id: string }> {
  const owner = await getCurrentPortalVehicleOwner(userId, input.vehicleId);
  const settings = await getGarageAppointmentSettings(owner.garageId);
  const endsAt = assertAppointmentSlot(settings, input.scheduledAt);
  try {
    return await createAppointment({ garageId: owner.garageId, customerId: owner.customerId, vehicleId: input.vehicleId, scheduledAt: input.scheduledAt, endsAt, serviceRequest: input.serviceRequest, note: input.note, createdById: userId });
  } catch (error) {
    if (isExclusionViolation(error)) throw new BusinessRuleError("Xe đã có lịch hẹn trùng thời gian.");
    throw error;
  }
}
```

Reschedule runs one transaction: lock original appointment, require `PENDING|CONFIRMED`, mark original cancelled with `cancelReason`, create new appointment, write both audit rows.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- tests/unit/appointments.test.ts && pnpm test:integration -- tests/integration/appointments.test.ts`  
Expected: PASS for working-hours, owner scope, overlap, confirm/cancel/no-show/reschedule.

### Task 4: Create reception and repair-order atomic services

**Files:**
- Modify: `src/data/repair-orders.ts:13-83`
- Create: `src/features/repair-orders/schema.ts`
- Create: `src/features/repair-orders/service.ts`
- Test: `tests/integration/repair-orders-reception.test.ts`

**Interfaces:**
- Produces `checkInAppointment(garageId, actor, appointmentId, input): Promise<{ id: string; code: string }>`.
- Produces `createWalkInRepairOrder(garageId, actor, input): Promise<{ id: string; code: string }>`.
- Produces `getRepairOrderDetail(garageId, id): Promise<RepairOrderDetail>`.

- [ ] **Step 1: Write RED integration tests**

```ts
it("creates one received order and marks appointment arrived atomically", async () => {
  const result = await checkInAppointment(garageId, receptionist, appointmentId, intake);
  expect((await prisma.repairOrder.findUnique({ where: { id: result.id } }))?.status).toBe("RECEIVED");
  expect((await prisma.appointment.findUnique({ where: { id: appointmentId }))?.status).toBe("ARRIVED");
});

it("rejects a retry without creating another repair order", async () => {
  await checkInAppointment(garageId, receptionist, appointmentId, intake);
  await expect(checkInAppointment(garageId, receptionist, appointmentId, intake)).rejects.toBeInstanceOf(BusinessRuleError);
});
```

- [ ] **Step 2: Define validated intake input**

```ts
export const receptionSchema = z.object({
  mileageKm: mileageKmSchema,
  fuelLevel: z.coerce.number().int().min(0).max(100).nullable(),
  initialNote: optionalText(2_000),
  intakeChecklist: z.record(z.string(), z.boolean()).default({}),
  overrideReason: optionalText(255),
});
```

- [ ] **Step 3: Implement sequence and transaction**

```ts
async function nextRepairOrderCode(tx: PrismaTx, garageId: string, year: number): Promise<string> {
  const row = await tx.repairOrderSequence.upsert({
    where: { garageId_year: { garageId, year } },
    create: { garageId, year, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });
  return `RO-${year}-${String(row.nextValue - 1).padStart(4, "0")}`;
}
```

Within `prisma.$transaction`: `SELECT ... FOR UPDATE` appointment; assert `CONFIRMED`; allocate code; create RO; append mileage and update vehicle using shared lower-mileage rule; update appointment `ARRIVED`; write audit. Walk-in reuses same intake write after vehicle-in-garage assertion.

- [ ] **Step 4: Add detail query**

```ts
export async function getRepairOrderDetail(garageId: string, id: string): Promise<RepairOrderDetail> {
  const order = await prisma.repairOrder.findFirst({ where: { id, garageId }, select: detailSelect });
  if (!order) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");
  return order;
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test:integration -- tests/integration/repair-orders-reception.test.ts`  
Expected: PASS for check-in atomicity, walk-in, code uniqueness, mileage log/currentKm and tenant scope.

### Task 5: Expose server actions and build appointment/reception UI

**Files:**
- Create: `src/features/appointments/actions.ts`
- Create: `src/features/appointments/appointment-form.tsx`
- Create: `src/features/appointments/appointment-calendar.tsx`
- Create: `src/features/appointments/appointment-actions.tsx`
- Create: `src/features/appointments/settings-form.tsx`
- Create: `src/features/repair-orders/actions.ts`
- Create: `src/features/repair-orders/reception-form.tsx`
- Modify: `src/app/(dashboard)/lich-hen/page.tsx`
- Modify: `src/app/(dashboard)/cai-dat/page.tsx`
- Modify: `src/app/(dashboard)/lenh-sua-chua/page.tsx`
- Create: `src/app/(dashboard)/lenh-sua-chua/[id]/page.tsx`
- Create: `src/app/tai-khoan/lich-hen/moi/page.tsx`
- Create: `src/app/tai-khoan/lich-hen/[id]/page.tsx`
- Modify: `src/app/tai-khoan/page.tsx`

**Interfaces:**
- Actions return `Promise<ActionResult<T>>`; parse `FormData`, authorize server-side, revalidate relevant pages.

- [ ] **Step 1: Write actions matching existing `runAction` boundary**

```ts
export async function createPortalAppointmentAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = appointmentInputSchema.safeParse({ vehicleId: formData.get("vehicleId"), scheduledAt: formData.get("scheduledAt"), serviceRequest: formData.get("serviceRequest"), note: formData.get("note") });
    if (!parsed.success) throw new ValidationError("Dữ liệu lịch hẹn không hợp lệ.", formErrors(parsed.error));
    const user = requirePermission(await getSessionUser(), "appointment:write");
    const result = await createCustomerAppointment(user.id, parsed.data);
    revalidatePath("/tai-khoan");
    return result;
  });
}
```

- [ ] **Step 2: Replace dashboard placeholder with date/status schedule**

Render RSC data from `listGarageAppointments(garageId, range, status)`. Use forms/buttons only when `can(user, "appointment:confirm")`; show `Confirm`, `Cancel`, `No-show`, `Tiếp nhận` with accessible labels. Use `searchParams` for date/status filter.

- [ ] **Step 3: Add portal booking/detail UI**

`/tai-khoan/lich-hen/moi` renders only currently owned vehicles and server-derived slots. Detail page resolves appointment via session user, renders cancel/reschedule only for open statuses. Add `Đặt lịch` link from portal home.

- [ ] **Step 4: Add reception form and detail route**

Reception form inputs: mileage, fuel 0–100, initial note, checklist; supports appointment check-in and walk-in. List page adds walk-in CTA only for `repair-order:write`. Detail renders code/status/customer/vehicle/intake/media links. Existing list links now resolve.

- [ ] **Step 5: Add manager-only settings form**

Form submits slot minutes and weekday `{open, close}` fields. Action requires `garage-settings:write`, calls typed settings updater and notes that only future/rescheduled bookings use new hours.

- [ ] **Step 6: Verify UI build**

Run: `pnpm lint && pnpm typecheck && pnpm build`  
Expected: PASS; no dead `/lenh-sua-chua/[id]` route.

### Task 6: Add private AWS S3 media flow

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `.env.example`, `docs/DEPLOYMENT.md`
- Create: `src/lib/s3.ts`
- Create: `src/features/media/schema.ts`, `src/features/media/service.ts`, `src/features/media/uploader.tsx`
- Create: `src/app/api/media/presign/route.ts`
- Create: `src/app/api/media/complete/route.ts`
- Create: `src/app/api/media/[id]/download/route.ts`
- Test: `tests/unit/media.test.ts`, `tests/integration/media.test.ts`

**Interfaces:**
- `createUploadIntent(user, input): Promise<{ uploadUrl: string; uploadToken: string }>`.
- `completeUpload(user, token): Promise<{ id: string }>`.
- `createDownloadUrl(user, mediaId): Promise<string>`.

- [ ] **Step 1: Add deps and server-only config**

Run: `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

```env
AWS_REGION="ap-southeast-1"
AWS_S3_BUCKET=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

`src/lib/s3.ts` imports `server-only`, creates `S3Client`, and uses `getSignedUrl(client, new PutObjectCommand(...), { expiresIn: 300 })`; GET expires in 300 seconds.

- [ ] **Step 2: Write RED media tests**

```ts
expect(validateMediaBytes("image/jpeg", JPEG_MAGIC)).toEqual({ kind: "IMAGE", mimeType: "image/jpeg" });
expect(() => validateMediaBytes("image/png", Buffer.from("not-image"))).toThrow(ValidationError);
expect(() => validateDeclaredSize(10 * 1024 * 1024 + 1)).toThrow(ValidationError);
```

- [ ] **Step 3: Implement server authority**

Presign validates session, `repairOrderId`, phase `RECEPTION`, declared type/size and garage-scoped parent. Generate `garages/${garageId}/repair-orders/${repairOrderId}/${crypto.randomUUID()}`. Sign opaque HMAC token containing key/parent/user/expiry/type/size. Complete validates token/session, calls `HeadObject`, range-reads first bytes, checks exact size and magic signature, then creates `Media` with server-derived kind.

- [ ] **Step 4: Implement routes**

```ts
export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();
  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ message: "Dữ liệu upload không hợp lệ." }, { status: 400 });
  const user = requirePermission(await getSessionUser(), "media:write");
  return Response.json(await createUploadIntent(user, parsed.data));
}
```

Download resolves `Media` from ID, authorizes through repair-order parent, then returns a short-lived redirect or JSON URL. Never return raw bucket paths.

- [ ] **Step 5: Add reception uploader**

Client sequence: presign `fetch` → `fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })` → complete `fetch`. Client size/type checks are UX only. Show status with `aria-live="polite"`; disable repeated upload controls while pending.

- [ ] **Step 6: Verify media tests**

Run: `pnpm test -- tests/unit/media.test.ts && pnpm test:integration -- tests/integration/media.test.ts`  
Expected: PASS using injected S3 adapter/fake for signature, parent, token and authorization tests.

### Task 7: Seed deterministic M3 data and E2E

**Files:**
- Modify: `prisma/seed.ts`
- Create: `tests/e2e/milestone-3-appointments.spec.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add customer E2E environment names**

```env
E2E_CUSTOMER_EMAIL=""
E2E_CUSTOMER_PASSWORD=""
E2E_MANAGER_EMAIL=""
E2E_RECEPTIONIST_EMAIL=""
E2E_STAFF_PASSWORD=""
```

- [ ] **Step 2: Write multi-role flow**

```ts
test("customer booking is confirmed and checked in by receptionist", async ({ browser }) => {
  const customer = await browser.newPage();
  await login(customer, "E2E_CUSTOMER_EMAIL", "E2E_CUSTOMER_PASSWORD");
  await customer.goto("/tai-khoan/lich-hen/moi");
  await customer.getByLabel("Xe").selectOption({ label: "30G-123.45" });
  await customer.getByLabel("Khung giờ").selectOption({ index: 0 });
  await customer.getByRole("button", { name: "Đặt lịch" }).click();

  const receptionist = await browser.newPage();
  await login(receptionist, "E2E_RECEPTIONIST_EMAIL", "E2E_STAFF_PASSWORD");
  await receptionist.goto("/lich-hen");
  await receptionist.getByRole("button", { name: "Xác nhận lịch hẹn" }).click();
  await receptionist.getByRole("button", { name: "Tiếp nhận xe" }).click();
  await expect(receptionist.getByText(/^RO-\d{4}-\d{4}$/)).toBeVisible();
});
```

- [ ] **Step 3: Run full M3 verification**

Run: `pnpm db:seed && pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build && pnpm test:e2e -- tests/e2e/milestone-3-appointments.spec.ts`  
Expected: all green. If S3 test bucket unavailable, report skipped integration/E2E upload verification explicitly; do not claim it passed.

### Task 8: Review and update progress record

**Files:**
- Modify: `docs/progress/MILESTONE-03.md`
- Test: all M3 commands above

- [ ] **Step 1: Record exact completed scope and constraints**

Document S3 private-bucket contract, slot/working-hour default, persisted `endsAt`, tenant/ownership checks, verification command output and skipped checks.

- [ ] **Step 2: Security and code reviews**

Use `security-reviewer`, `code-reviewer`, `react-reviewer`, and `e2e-runner`. Fix confirmed CRITICAL/HIGH findings before complete.

- [ ] **Step 3: Final verification**

Run: `git diff --check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build && pnpm test:e2e`  
Expected: no whitespace errors; all checks pass.

## Spec Coverage Review

- Working-hours settings and per-vehicle overlap: Tasks 1–3, 5.
- Customer appointment, garage confirmation/no-show/cancel/reschedule: Tasks 3 and 5.
- Atomic check-in, walk-in, mileage/fuel/checklist/code: Task 4–5.
- Private AWS S3 media: Task 6.
- M3 unit/integration/E2E coverage: Tasks 1–7.
- Audit, RBAC and tenant isolation: Tasks 2–6.

## Plan Self-Review

- Placeholder scan: no `TODO`/`TBD` or deferred implementation instructions.
- Scope: only Mốc 3; no inspection, quotation, work task, inventory, invoice work.
- Consistency: `endsAt` is persisted because dynamic slot duration cannot be enforced safely by a constraint derived from mutable JSON settings. All service/UI methods use the same appointment/repair-order/media names.
