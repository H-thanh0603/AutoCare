# Mốc 4 — Kiểm tra và báo giá Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff ghi nhận kiểm tra xe và gửi báo giá theo phiên bản; khách xem, nhận thông báo và duyệt từng hạng mục trong portal.

**Architecture:** Giữ pattern hiện có: `src/data/*` chỉ truy vấn Prisma có scope, `src/features/*` chứa Zod/service/server action/UI, và pages là RSC. Mutation của inspection và quotation chạy trong transaction, dùng state machine ở `src/lib/transitions.ts`, tiền VND qua `src/lib/money.ts`, và audit qua `recordAudit`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Auth.js, Zod, React Hook Form, Vitest, Playwright.

## Global Constraints

- `docs/WORKFLOWS.md` là nguồn đúng cho transition; không set `status` tùy ý.
- Scope garage lấy từ session; resource khác garage trả `NotFoundError`.
- Customer chỉ đọc/duyệt quotation của xe đang sở hữu qua `Customer.userId` và `VehicleOwnership.isCurrent`.
- Chỉ `DRAFT` được sửa; báo giá đã gửi được thay bằng revision, không update trực tiếp.
- Tất cả amount là `Int` VND và total được tính server-side bằng `calculateLineTotal`/`addMoney`.
- Audit, state update và notification của một mutation nhạy cảm cùng Prisma transaction.
- Không tạo work task, phân công, tồn kho, realtime hoặc upload UI mới trong M4.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Enforce một inspection/repair order và relation quotation bổ sung. |
| `src/lib/transitions.ts` | Keep quotation item approvals terminal as required by the workflow. |
| `src/lib/rbac.ts` | Grant receptionist inspection write and manager replacement approval. |
| `src/data/inspections.ts` | Garage-scoped inspection reads. |
| `src/data/quotations.ts` | Garage/customer-scoped quotation reads and DTOs. |
| `src/data/notifications.ts` | User-scoped notification list/mark-read. |
| `src/features/inspections/*` | Schema, atomic inspection mutations, staff action/form. |
| `src/features/quotations/*` | Schema, draft/revision/send/decision services and actions/forms. |
| `src/features/notifications/*` | Mark-read action and inbox presentation. |
| `src/app/(dashboard)/lenh-sua-chua/[id]/page.tsx` | Staff inspection and quotation workspace. |
| `src/app/tai-khoan/bao-gia/[id]/page.tsx` | Customer quotation detail and per-item decisions. |
| `src/app/tai-khoan/thong-bao/page.tsx` | Customer notification inbox. |
| `tests/integration/inspection-quotation.test.ts` | Tenant, ownership, versioning, audit and notification rules. |
| `tests/e2e/milestone-4-inspection-quotation.spec.ts` | Staff-to-customer approval flow. |

### Task 1: Persist M4 invariants

**Files:**
- Modify: `prisma/schema.prisma:443-542`
- Create: `prisma/migrations/<timestamp>_milestone_4_inspection_quotation/migration.sql`
- Modify: `src/lib/transitions.ts`
- Modify: `tests/unit/transitions.test.ts`
- Test: `tests/integration/inspection-quotation.test.ts`

**Interfaces:**
- Produces a unique `Inspection.repairOrderId`.
- Produces `Quotation.parentQuotationId`, `parentQuotation`, and `supplementaryQuotations`.

- [x] **Step 1: Write failing integration checks for the database invariants**

```ts
await prisma.inspection.create({ data: { garageId, repairOrderId } });
await expect(prisma.inspection.create({ data: { garageId, repairOrderId } }))
  .rejects.toMatchObject({ code: "P2002" });
expect(() => assertQuotationItemTransition("APPROVED", "REJECTED")).toThrow(BusinessRuleError);
```

- [x] **Step 2: Run the focused integration test**

Run: `pnpm test:integration -- tests/integration/inspection-quotation.test.ts`
Expected: FAIL because duplicate inspection is currently accepted.

- [x] **Step 3: Make approved and rejected quotation items terminal**

```ts
export const QUOTATION_ITEM_TRANSITIONS: TransitionMap<QuotationItemStatus> = {
  PENDING: ["APPROVED", "REJECTED", "NEEDS_CLARIFICATION"],
  NEEDS_CLARIFICATION: ["APPROVED", "REJECTED", "PENDING"],
  APPROVED: [],
  REJECTED: [],
};
```

Update the current unit test that permits changing a decision so it asserts the
business-rule error. This matches the already-approved workflow: corrections
after a decision use a quotation revision.

- [x] **Step 4: Add only the required schema relations and unique index**

```prisma
model Inspection {
  repairOrderId String @unique
}

model Quotation {
  parentQuotationId       String?
  parentQuotation         Quotation?  @relation("SupplementaryQuotation", fields: [parentQuotationId], references: [id])
  supplementaryQuotations Quotation[] @relation("SupplementaryQuotation")
  @@index([parentQuotationId])
}
```

- [x] **Step 5: Create and apply the Prisma migration, then regenerate the client**

Run: `pnpm db:migrate -- --name milestone_4_inspection_quotation && pnpm db:generate`
Expected: migration adds the unique inspection index and nullable supplementary relation without data loss.

- [x] **Step 6: Re-run focused unit and integration tests**

Run: `pnpm test -- tests/unit/transitions.test.ts && pnpm test:integration -- tests/integration/inspection-quotation.test.ts`
Expected: PASS for terminal decisions and the uniqueness assertion.

- [x] **Step 7: Commit the invariant**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/transitions.ts tests/unit/transitions.test.ts tests/integration/inspection-quotation.test.ts
git commit -m "feat: enforce inspection and supplementary quotation invariants"
```

### Task 2: Add inspection service, authorization, and audit

**Files:**
- Create: `src/data/inspections.ts`
- Create: `src/features/inspections/schema.ts`
- Create: `src/features/inspections/service.ts`
- Create: `src/features/inspections/actions.ts`
- Modify: `src/lib/audit.ts`
- Modify: `src/lib/rbac.ts`
- Modify: `src/features/media/schema.ts`
- Modify: `src/features/media/service.ts`
- Modify: `src/data/repair-orders.ts`
- Test: `tests/integration/inspection-quotation.test.ts`

**Interfaces:**
- Produces `startInspection(garageId, actorUserId, repairOrderId)` and `saveInspection(garageId, actorUserId, repairOrderId, input)`.
- Produces `getInspectionForRepairOrder(garageId, repairOrderId)` returning item rows in `sortOrder` order.
- Extends the existing M3 upload intent with optional `inspectionItemId`, always validated against the scoped repair order.

- [ ] **Step 1: Add failing tests for start, update, and garage scope**

```ts
await startInspection(garageId, actorId, repairOrderId);
await expect(startInspection(otherGarageId, actorId, repairOrderId))
  .rejects.toBeInstanceOf(NotFoundError);
expect((await prisma.repairOrder.findUniqueOrThrow({ where: { id: repairOrderId } })).status)
  .toBe("INSPECTING");
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm test:integration -- tests/integration/inspection-quotation.test.ts`
Expected: FAIL because inspection services do not exist.

- [ ] **Step 3: Define validated inspection input and server-owned fields**

```ts
export const inspectionSchema = z.object({
  summary: z.string().trim().max(2_000).nullable(),
  items: z.array(z.object({
    id: z.string().cuid().optional(),
    category: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    severity: z.enum(["OK", "ATTENTION", "URGENT"]),
    finding: z.string().trim().max(2_000).nullable(),
    recommendation: z.string().trim().max(2_000).nullable(),
  })).min(1).max(50),
});
```

- [ ] **Step 4: Implement transaction-backed inspection mutations**

```ts
assertRepairOrderTransition(order.status, "INSPECTING");
const inspection = await tx.inspection.create({
  data: { garageId, repairOrderId, inspectorId: actorUserId },
});
```

`startInspection` creates the one inspection and transitions `RECEIVED → INSPECTING` in one transaction. `saveInspection` requires the existing scoped inspection and an `INSPECTING` repair order; it must not attempt a self-transition. Delete only submitted-out items, update item IDs with both `id` and `inspectionId`, then create new items in sort order. Record `inspection.started`/`inspection.updated` audit actions in the same transaction.

- [ ] **Step 5: Add server actions with existing permission guards**

```ts
const user = requirePermission(await getSessionUser(), "inspection:write");
const { garageId } = requireGarageScope(user);
```

Actions must revalidate `/lenh-sua-chua`, `/lenh-sua-chua/${repairOrderId}`, and no client-supplied garage id is accepted.

- [ ] **Step 6: Align the existing RBAC and media service with inspection scope**

```ts
const RECEPTIONIST_PERMISSIONS: readonly Permission[] = [
  // existing permissions
  "inspection:write",
];
```

Keep technician and manager access unchanged. Extend the M3 upload token with
`inspectionItemId?: string`; before presign and before complete, query that item
through `{ id, inspection: { repairOrderId, garageId } }`. Persist both
`repairOrderId` and `inspectionItemId` on the media row. A caller cannot attach
an upload to an item in another repair order or garage.

- [ ] **Step 7: Re-run focused tests and typecheck**

Run: `pnpm test:integration -- tests/integration/inspection-quotation.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit the inspection slice**

```bash
git add src/data/inspections.ts src/features/inspections src/features/media src/data/repair-orders.ts src/lib/audit.ts src/lib/rbac.ts tests/integration/inspection-quotation.test.ts
git commit -m "feat: add repair order inspections"
```

### Task 3: Build draft, send, and revision quotation services

**Files:**
- Create: `src/data/quotations.ts`
- Create: `src/features/quotations/schema.ts`
- Create: `src/features/quotations/service.ts`
- Create: `src/features/quotations/actions.ts`
- Modify: `src/lib/audit.ts`
- Test: `tests/unit/money.test.ts`
- Test: `tests/integration/inspection-quotation.test.ts`

**Interfaces:**
- Produces `saveQuotationDraft`, `sendQuotation`, and `createQuotationRevision`.
- `saveQuotationDraft` accepts `{ repairOrderId, note, validUntil, items }` and returns `{ id, versionNo, totalAmount }`.
- `sendQuotation` returns a sent quotation and transitions the repair order to `WAITING_CUSTOMER_APPROVAL`.

- [ ] **Step 1: Add failing total and immutability tests**

```ts
await saveQuotationDraft(garageId, actorId, draft);
await sendQuotation(garageId, actorId, quotationId);
await expect(saveQuotationDraft(garageId, actorId, { ...draft, id: quotationId }))
  .rejects.toBeInstanceOf(BusinessRuleError);
```

- [ ] **Step 2: Run the focused tests**

Run: `pnpm test -- tests/unit/money.test.ts && pnpm test:integration -- tests/integration/inspection-quotation.test.ts`
Expected: FAIL because quotation services do not exist.

- [ ] **Step 3: Validate input and calculate every price on the server**

```ts
const totalAmount = calculateLineTotal({
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  discountAmount: item.discountAmount,
});
const quotationTotal = addMoney(...items.map((item) => item.totalAmount));
```

Reject a service/part outside `garageId`, non-positive quantity, a discount greater than the line total, and `validUntil` not later than now.

- [ ] **Step 4: Implement draft save and revision atomically with conflict detection**

```ts
if (!isQuotationEditable(existing.status)) {
  throw new BusinessRuleError("Báo giá đã gửi phải tạo phiên bản mới.");
}
```

`createQuotationRevision` locks the original quotation, calls `assertQuotationTransition(old.status, "SUPERSEDED")`, creates the next `versionNo` with copied/new items, and updates the old row's `supersededById` in the same transaction. Copying replaces any mutable client-controlled totals with calculated values.

The form sends the current `Quotation.version`. The update must be conditional:

```ts
const updated = await tx.quotation.updateMany({
  where: { id: original.id, version: input.version, status: original.status },
  data: { status: "SUPERSEDED", supersededById: revision.id, version: { increment: 1 } },
});
if (updated.count !== 1) throw new ConflictError("Báo giá vừa được thay đổi. Hãy tải lại trang.");
```

- [ ] **Step 5: Implement send with notification and audit in one transaction**

```ts
assertQuotationTransition(quotation.status, "SENT");
assertRepairOrderTransition(order.status, "WAITING_CUSTOMER_APPROVAL");
await tx.notification.create({ data: { userId, garageId, type: "QUOTATION", title, data: { href } } });
```

Require at least one quotation item, resolve `userId` through the repair order's customer, set `sentAt`, update the repair order, and write `QUOTATION_SENT` audit. The `href` is constructed by the service as `/tai-khoan/bao-gia/${quotation.id}`.

- [ ] **Step 6: Re-run focused tests and lint**

Run: `pnpm test && pnpm test:integration -- tests/integration/inspection-quotation.test.ts && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit the quotation staff slice**

```bash
git add src/data/quotations.ts src/features/quotations src/lib/audit.ts tests/unit/money.test.ts tests/integration/inspection-quotation.test.ts
git commit -m "feat: add quotation draft send and revision workflow"
```

### Task 4: Implement customer item decisions and notifications

**Files:**
- Create: `src/data/notifications.ts`
- Create: `src/features/notifications/actions.ts`
- Modify: `src/data/portal.ts`
- Modify: `src/features/quotations/service.ts`
- Modify: `src/features/quotations/actions.ts`
- Modify: `src/lib/rbac.ts`
- Test: `tests/integration/inspection-quotation.test.ts`

**Interfaces:**
- Produces `getPortalQuotation(userId, quotationId)` and `listNotificationsForUser(userId)`.
- Produces `decideQuotationItem(userId, quotationItemId, decision)` and `markNotificationRead(userId, notificationId)`.
- Produces `decideQuotationItemAsManager(garageId, managerUserId, quotationItemId, decision)`; the input requires `managerReason` of at least 10 trimmed characters.

- [ ] **Step 1: Add failing ownership and status-derivation tests**

```ts
await decideQuotationItem(customerUserId, itemId, { status: "APPROVED", customerNote: null });
expect((await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } })).status)
  .toBe("PARTIALLY_APPROVED");
await expect(decideQuotationItem(otherUserId, itemId, { status: "REJECTED", customerNote: null }))
  .rejects.toBeInstanceOf(NotFoundError);
await expect(decideQuotationItemAsManager(garageId, managerId, itemId, {
  status: "APPROVED", customerNote: null, managerReason: "ngắn",
})).rejects.toBeInstanceOf(ValidationError);
```

- [ ] **Step 2: Run the focused integration test**

Run: `pnpm test:integration -- tests/integration/inspection-quotation.test.ts`
Expected: FAIL because portal quotation reads and item decisions do not exist.

- [ ] **Step 3: Add owner-scoped portal quotation read**

```ts
where: {
  id: quotationId,
  repairOrder: { customer: { userId }, vehicle: { ownerships: { some: { isCurrent: true, endedAt: null, customer: { userId } } } } },
}
```

The read includes inspection items, quotation items, garage name, vehicle plate, and no staff-only fields.

- [ ] **Step 4: Decide one line and derive the header in a transaction**

```ts
assertQuotationItemTransition(item.status, input.status);
const nextStatus = deriveQuotationStatus(itemStatusesAfterUpdate, quotation.status);
if (nextStatus !== quotation.status) assertQuotationTransition(quotation.status, nextStatus);
```

Only `SENT` or `PARTIALLY_APPROVED` quotations can receive decisions. The portal action resolves current vehicle ownership; the manager action uses `quotation:approve` and garage scope, then persists the minimum-length reason in audit metadata. Both set `decidedAt` and `customerNote`, recalculate the header status from all persisted item statuses, and record `QUOTATION_ITEM_DECIDED` audit. Add `quotation:approve` to the manager permission list only. Do not move the repair order to `IN_PROGRESS`; M5 creates approved work tasks.

- [ ] **Step 5: Add own-only notification list and mark-read action**

```ts
await prisma.notification.updateMany({
  where: { id: notificationId, userId, readAt: null },
  data: { readAt: new Date() },
});
```

Return `NotFoundError` when no matching notification is updated, so another user's notification cannot be probed.

- [ ] **Step 6: Re-run focused integration tests**

Run: `pnpm test:integration -- tests/integration/inspection-quotation.test.ts`
Expected: PASS for owner scope, decisions, audit, list, and mark-read.

- [ ] **Step 7: Commit the customer decision slice**

```bash
git add src/data/portal.ts src/data/notifications.ts src/features/notifications src/features/quotations src/lib/rbac.ts tests/integration/inspection-quotation.test.ts
git commit -m "feat: add customer quotation approvals and notifications"
```

### Task 5: Add staff and customer M4 screens

**Files:**
- Create: `src/features/inspections/inspection-form.tsx`
- Create: `src/features/quotations/quotation-form.tsx`
- Create: `src/features/quotations/quotation-decision-form.tsx`
- Create: `src/app/tai-khoan/bao-gia/[id]/page.tsx`
- Create: `src/app/tai-khoan/thong-bao/page.tsx`
- Modify: `src/app/(dashboard)/lenh-sua-chua/[id]/page.tsx`
- Modify: `src/app/tai-khoan/page.tsx`
- Test: `tests/e2e/milestone-4-inspection-quotation.spec.ts`

**Interfaces:**
- Staff page receives scoped repair-order detail, inspection, and quotations from server data functions.
- Customer detail calls `decideQuotationItemFormAction` using only quotation item id, decision, and note.

- [ ] **Step 1: Add a failing E2E skeleton for the M4 journey**

```ts
test("staff sends a quotation and customer approves one item", async ({ browser }) => {
  // log in staff, open repair order, start inspection, save and send quotation
  // log in customer, open notification quotation link, approve one item
});
```

- [ ] **Step 2: Run the E2E test to confirm it fails at missing controls**

Run: `pnpm test:e2e -- tests/e2e/milestone-4-inspection-quotation.spec.ts`
Expected: FAIL because M4 routes and controls are absent.

- [ ] **Step 3: Render the staff workspace without duplicate page state**

Use the existing `Card`, `Badge`, `Button`, `Input`, server actions, and status label helpers. The repair-order detail shows the latest inspection, an explicit start/save inspection form, quotation draft form, sent/revision history, and a send button only when allowed by the server-derived status.

- [ ] **Step 4: Render the customer quotation and notification inbox**

The quotation page displays VND totals via `formatVnd`, item status, description, and decision controls only when the item transition is valid. The portal home links each repair order waiting for approval to its latest sent quotation and links the inbox. The notification route lists only the session user's notifications and calls mark-read on its own row.

- [ ] **Step 5: Add basic accessibility and failure behaviour**

Use semantic labels for each field, `aria-live="polite"` for action feedback, disabled buttons while a form is pending, and `<FormError>`/existing `runAction` result handling. Do not expose raw IDs, staff notes, or a manual garage selector.

- [ ] **Step 6: Re-run E2E and UI-adjacent checks**

Run: `pnpm typecheck && pnpm lint && pnpm test:e2e -- tests/e2e/milestone-4-inspection-quotation.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit the M4 UI**

```bash
git add src/features/inspections src/features/quotations src/features/notifications src/app tests/e2e/milestone-4-inspection-quotation.spec.ts
git commit -m "feat: add inspection and quotation screens"
```

### Task 6: Seed, verify, and close M4

**Files:**
- Modify: `prisma/seed.ts`
- Create: `docs/progress/MILESTONE-04.md`
- Test: `tests/integration/inspection-quotation.test.ts`
- Test: `tests/e2e/milestone-4-inspection-quotation.spec.ts`

**Interfaces:**
- Seed provides a deterministic repair order awaiting customer approval and a portal user with a sent quotation.

- [ ] **Step 1: Extend the existing deterministic seed only where M4 screens need it**

Seed one received repair order for inspection and one sent quotation with pending line items. Reuse existing demo users, garage, vehicles, services, and parts; do not add synthetic domains or duplicate customers.

- [ ] **Step 2: Reset and seed the local database**

Run: `pnpm db:reset -- --force && pnpm db:seed`
Expected: migration and seed complete without unique/foreign-key errors.

- [ ] **Step 3: Run the full M4 verification sequence**

Run: `pnpm test && pnpm test:integration && pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e`
Expected: every command exits 0.

- [ ] **Step 4: Inspect the final diff and document actual evidence**

Run: `git diff --check && git status --short`
Expected: no whitespace errors; `docs/progress/MILESTONE-04.md` records passed commands and any environmental limitation such as absent S3 credentials.

- [ ] **Step 5: Commit verification and milestone report**

```bash
git add prisma/seed.ts docs/progress/MILESTONE-04.md tests
git commit -m "test: complete milestone 4 verification"
```

## Plan Self-Review

- Spec coverage: Tasks 1-2 implement inspection and its one-per-order rule; Task 3 handles drafts, versioning, send, money, audit and notification; Task 4 covers owner-only decisions and inbox; Task 5 adds both UI surfaces; Task 6 seeds and verifies the full route.
- Placeholder scan: no unresolved implementation markers or unspecified error handling remain.
- Consistency: customer decisions intentionally leave `RepairOrder` in `WAITING_CUSTOMER_APPROVAL`; M5 is the first milestone that creates a work task and advances the order.
