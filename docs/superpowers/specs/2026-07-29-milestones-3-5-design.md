# Thiết kế Mốc 3–5 — AutoCare

**Trạng thái:** Đã duyệt để lập kế hoạch
**Ngày:** 2026-07-29

## Mục tiêu

Hoàn thành ba lát cắt dọc, theo đúng thứ tự nghiệp vụ: lịch hẹn/tiếp nhận (Mốc 3), kiểm tra/báo giá (Mốc 4), thi công/kho (Mốc 5). Mỗi mốc phải hoạt động từ database, server authorization, UI đến kiểm thử trước khi bắt đầu mốc kế tiếp.

## Quyết định chung

- Giữ kiến trúc đang chạy: `src/data/*` cho Prisma access, `src/features/*` cho schema, service, action, UI. Không refactor sang `src/modules/*` trong phạm vi này.
- `docs/WORKFLOWS.md` là nguồn sự thật nghiệp vụ. Sửa `src/lib/transitions.ts` trước khi thêm mutation:
  - Appointment `ARRIVED` là trạng thái không thể hủy.
  - `QuotationItem.APPROVED` và `REJECTED` là terminal.
  - `WorkTask` bắt buộc đi từ `IN_PROGRESS` qua `QUALITY_CHECK` trước `COMPLETED`.
- Mọi write lấy `garageId` từ session, không tin client. Resource khác garage trả `NotFoundError`.
- Ghi audit cùng transaction cho thay đổi trạng thái, duyệt thay, giao việc và giao dịch kho.
- Migration chỉ thêm invariant phục vụ feature:
  - Một `Inspection` cho một `RepairOrder`.
  - Một `WorkTask` cho một `QuotationItem`.
  - Quan hệ rõ cho quotation revision và quotation supplementary.
  - Cấu hình lịch hẹn trong `Garage.settings`.
- Chỉnh permission map theo RBAC: `media:*`, `notification:*`, lễ tân ghi inspection/phân công, manager duyệt thay có audit; technician bị giới hạn task được giao và xuất kho cho task đó.

## Mốc 3 — Lịch hẹn và tiếp nhận

### Cấu hình lịch

`Garage.settings` có `appointmentSlotMinutes` và lịch làm việc theo từng ngày tuần. Manager chỉnh tại `/cai-dat`.

Mặc định: slot 60 phút, Thứ 2–Thứ 7 08:00–17:00, Chủ nhật đóng.

### Lịch hẹn

Customer tạo appointment cho xe đang sở hữu, chọn slot nằm trong giờ làm việc. Garage xem lịch ngày/tuần, lọc trạng thái, xác nhận/hủy/no-show.

Một xe không được có hai appointment mở (`PENDING`, `CONFIRMED`) chồng thời gian. Server kiểm tra range; PostgreSQL thêm ràng buộc phù hợp để chặn race. Đổi lịch bằng cách hủy appointment cũ và tạo appointment mới để giữ lịch sử.

### Tiếp nhận

Check-in chuyển `Appointment.CONFIRMED → ARRIVED` và tạo đúng một `RepairOrder.RECEIVED` trong transaction. Walk-in tạo repair order không gắn appointment.

Form tiếp nhận lưu mileage, fuel, initial note, checklist tình trạng và media. Mileage ghi append-only vào `MileageLog` rồi đồng bộ `Vehicle.currentKm` bằng quy tắc Mốc 2. Repair order có mã `RO-YYYY-####`, cấp transaction-safe và unique theo garage. Tạo route `/lenh-sua-chua/[id]` để thay link chi tiết đang chết.

### Media AWS S3

Dùng AWS S3. Server tạo key và presigned PUT URL sau khi xác thực parent resource. Client upload trực tiếp S3. Client gọi complete endpoint để tạo `Media` sau upload. Download dùng presigned GET URL ngắn hạn sau authorization.

Chỉ chấp nhận JPEG, PNG, WEBP, PDF; kích thước tối đa 10 MB. Không tin MIME, filename, `garageId`, storage key hay URL từ client. Media phải gắn parent được phép truy cập.

### Kiểm thử Mốc 3

- Unit state transition appointment và validation lịch.
- Integration overlap cùng xe, tenant/customer ownership, check-in tạo đúng một repair order, walk-in, mileage/audit, media MIME/size/parent scope.
- E2E: customer đặt lịch, lễ tân xác nhận và tiếp nhận.

## Mốc 4 — Kiểm tra và báo giá

### Inspection

Repair order detail có phần inspection. Technician được giao hoặc receptionist/manager tạo một inspection duy nhất cho repair order. Item có category, name, severity (`OK`, `ATTENTION`, `URGENT`), finding, recommendation, sort order và media AWS S3.

Bắt đầu inspection chuyển repair order `RECEIVED → INSPECTING`. Customer chỉ xem inspection của xe họ đang sở hữu.

### Quotation

Tạo quotation draft từ inspection, gồm item service, part hoặc other. Toàn bộ tính VND dùng `Int` qua `src/lib/money.ts`.

Chỉ draft được chỉnh. Gửi quotation chuyển `DRAFT → SENT`, repair order sang `WAITING_CUSTOMER_APPROVAL`, ghi audit và tạo in-app notification cho customer. Deep link notification chỉ nhận route nội bộ trong allowlist.

Customer duyệt, từ chối hoặc yêu cầu giải thích từng item. Service tính lại quotation status thành `PARTIALLY_APPROVED`, `APPROVED` hoặc `REJECTED`.

Manager duyệt thay phải có lý do tối thiểu và audit actor/reason. Thay đổi quotation đã gửi tạo revision mới; bản cũ `SUPERSEDED` trong một transaction. Supplementary quotation liên kết quotation gốc, chỉ chứa hạng mục phát sinh. Mốc 4 không sinh task.

### Notifications và kiểm thử Mốc 4

Có inbox customer/dashboard theo user, mark-read own-only.

- Unit/integration: one inspection per repair order, scope inspection, sent quotation immutable, revision atomic + optimistic conflict, owner-only approval, header derivation, manager approval audit, notification own/read.
- E2E: inspection, gửi quotation, customer duyệt từng item.

## Mốc 5 — Thi công và kho

### Work task

Chỉ tạo một `WorkTask.NOT_STARTED` từ `QuotationItem.APPROVED`. Receptionist/manager phân công technician đang active trong garage.

`/cong-viec` hiển thị Kanban theo state. MVP dùng native HTML drag/drop; server action luôn kiểm tra row-level authorization, transition và optimistic version; reload khi conflict.

Technician chỉ xem/cập nhật task được giao. Họ bắt đầu, tạm dừng, chờ phụ tùng/chờ duyệt và báo hoàn thành tới `QUALITY_CHECK`. Manager trả về `IN_PROGRESS` hoặc duyệt `COMPLETED`. Mỗi thay đổi ghi `WorkLog` và audit. Khi mọi task liên quan hoàn tất, repair order chuyển `QUALITY_CHECK`.

### Kho

`/kho` có catalog part, tồn hiện tại, ngưỡng thấp và ledger. Manager CRUD Part với SKU unique trong garage. Nhập, điều chỉnh, hoàn kho theo RBAC. Technician chỉ issue part cho task được giao.

Issue chạy Prisma transaction: xác thực assignment, tạo `InventoryTransaction.ISSUE`, trừ `Part.quantityInStock`, audit. Tồn âm bị chặn, trừ khi `Garage.settings.allowNegativeStock` bật. Hủy task đã issue thì `RETURN` và hoàn kho trong transaction. Low stock khi `quantityInStock <= lowStockThreshold`.

Phát sinh: task `WAITING_APPROVAL`, tạo supplementary quotation theo Mốc 4; item được duyệt sinh task mới; task cũ tiếp tục khi có duyệt.

### Kiểm thử Mốc 5

- Unit/integration: approved-only task, no duplicate task, assignment/scope, Kanban transitions, work-log/audit, atomic issue/return, insufficient stock, allow-negative, low-stock.
- E2E: quotation item approved, task assignment/progress, issue part, quality check.

## Ngoài phạm vi

- Refactor kiến trúc `src/features` sang `src/modules`.
- Capacity booking theo số xe/slot.
- S3 provider fallback, multipart uploads lớn hơn 10 MB, CDN/public media.
- Realtime subscription, TanStack Query hoặc dependency drag/drop mới.
- Invoice, payment, quality/delivery workflow đầy đủ (Mốc 6).

## Tiêu chí hoàn tất mỗi mốc

1. UI và server authorization cùng enforce RBAC/tenant/ownership.
2. Migration, seed và test thêm mới chạy lặp lại được.
3. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm build` đều xanh.
4. Playwright cover happy path mutation của mốc.
5. Code review và security review không còn finding CRITICAL/HIGH.
