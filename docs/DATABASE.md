# AutoCare — Thiết kế database

Database: **PostgreSQL**, ORM: **Prisma**. Migration phải tái lập được (`prisma migrate dev` /
`prisma migrate deploy`), có `prisma/seed.ts` cho dữ liệu demo tiếng Việt.

## 1. Quyết định nền tảng (đã chốt)

1. **Tiền = `Int` đơn vị VND (đồng)**. VND không có đơn vị nhỏ hơn đồng nên không cần số thập
   phân; mọi cột tiền (`unitPrice`, `subtotal`, `total`, `amountPaid`, `balance`...) là `Int`
   (giới hạn 32-bit ~2.1 tỷ đồng, đủ cho garage — nếu cần vượt ngưỡng này ở tương lai SaaS lớn,
   đổi sang `BigInt`, ghi ADR mới). Không dùng `Float`/`Decimal` cho số tiền lưu trữ, không tính
   tiền bằng floating-point JavaScript trực tiếp — mọi phép cộng/trừ/tổng hợp tiền dùng hàm trong
   `src/lib/money.ts`.
   - Khi tổng hợp (SUM) nhiều dòng tiền trong SQL/Prisma aggregate, dùng **BigInt** cho biến tích
     lũy ở tầng service để tránh tràn số khi cộng nhiều `Int`, sau đó ép về `Int` khi lưu lại nếu
     giá trị nằm trong giới hạn hợp lệ, hoặc throw lỗi nếu vượt ngưỡng.
2. **Mọi bảng thuộc garage có cột `garageId`** (foreign key tới `Garage`), có index
   `@@index([garageId])` hoặc composite index bắt đầu bằng `garageId` cho các truy vấn thường
   dùng.
3. **Soft-delete cho `RepairOrder`**: không có `deletedAt` xoá cứng; thay vào đó dùng
   `status = CANCELLED` để đánh dấu ngừng hoạt động. Repository không cung cấp hàm `hardDelete`
   cho `RepairOrder`.
4. **`version` field (optimistic concurrency)** cho: `Quotation`, `RepairOrder`, `InventoryItem`
   (tồn kho), `Invoice`. Mọi update phải kèm điều kiện `WHERE version = :expectedVersion` và tăng
   `version` lên 1; nếu không có dòng nào khớp → ném `ConflictError` (409) yêu cầu người dùng tải
   lại dữ liệu mới nhất.
5. Enum trạng thái dùng Prisma `enum`, không dùng magic string.
6. Timestamp: `createdAt` (`@default(now())`), `updatedAt` (`@updatedAt`) trên mọi bảng nghiệp vụ.

## 2. Entity chính và quan hệ

```
Garage 1───* GarageMember *───1 User
Garage 1───* Customer
Garage 1───* Vehicle (qua VehicleOwnership hiện tại; xe có thể đổi garage phục vụ? → không, MVP:
             Vehicle thuộc 1 garage "sân nhà" — quyết định D5, chưa hỗ trợ multi-garage cho 1 xe)
Customer 1───* VehicleOwnership *───1 Vehicle      (lịch sử chủ sở hữu, has current flag)
Vehicle 1───* MileageRecord
Vehicle 1───* Appointment
Vehicle 1───* RepairOrder
Vehicle 1───* TimelineEvent                         (hồ sơ sức khỏe)
Vehicle 1───* Warranty
Vehicle 1───* ShareLink
Vehicle 1───* Media (qua polymorphic relation hoặc qua RepairOrder/Inspection — xem mục 4)

Appointment 1───1 RepairOrder (0..1, tạo khi tiếp nhận)
RepairOrder 1───1 Inspection (0..1)
Inspection 1───* InspectionItem
RepairOrder 1───* Quotation                         (nhiều version)
Quotation 1───* QuotationItem
QuotationItem 1───0..1 WorkTask                     (chỉ tạo khi item APPROVED)
RepairOrder 1───* WorkTask
WorkTask 1───* WorkLog
WorkTask *───1 User (assignedTechnician)
RepairOrder 1───* InventoryTransaction              (xuất kho phục vụ sửa chữa)
Part 1───1 InventoryItem (tồn kho hiện tại theo garage)
InventoryItem 1───* InventoryTransaction
RepairOrder 1───0..1 Invoice
Invoice 1───* Payment
RepairOrder 1───* MaintenanceRecord (tạo khi hoàn tất, feed vào TimelineEvent)
```

## 3. Enum trạng thái (đúng theo `prompt.md`)

```prisma
enum RepairOrderStatus {
  RECEIVED
  INSPECTING
  WAITING_CUSTOMER_APPROVAL
  WAITING_PARTS
  IN_PROGRESS
  QUALITY_CHECK
  READY_FOR_DELIVERY
  COMPLETED
  CANCELLED
}

enum QuotationStatus {
  DRAFT
  SENT
  PARTIALLY_APPROVED
  APPROVED
  REJECTED
  EXPIRED
  SUPERSEDED
}

enum QuotationItemStatus {
  PENDING
  APPROVED
  REJECTED
  NEEDS_CLARIFICATION
}

enum WorkTaskStatus {
  NOT_STARTED
  WAITING_PARTS
  IN_PROGRESS
  PAUSED
  WAITING_APPROVAL
  QUALITY_CHECK
  COMPLETED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  ARRIVED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

Danh sách transition hợp lệ cho từng enum nằm ở `docs/WORKFLOWS.md` (không lặp lại ở đây để tránh
hai nguồn sự thật lệch nhau).

## 4. Hồ sơ sức khỏe xe — timeline & nguồn dữ liệu

```prisma
enum TimelineEventType {
  MAINTENANCE
  REPAIR
  INSPECTION
  PART_REPLACEMENT
  ACCIDENT
  RESCUE
  REGISTRATION
  INSURANCE
  OIL_CHANGE
  TIRE_CHANGE
  BATTERY_CHANGE
  MILEAGE_UPDATE
  OWNERSHIP_TRANSFER
}

enum RecordSource {
  VERIFIED_GARAGE_RECORD   // tạo tự động từ nghiệp vụ garage đã hoàn tất (RepairOrder COMPLETED...)
  OWNER_PROVIDED_RECORD    // chủ xe tự khai báo (ví dụ bảo dưỡng ở nơi khác)
  IMPORTED_RECORD          // nhập từ nguồn ngoài (import dữ liệu cũ, migration)
}
```

`TimelineEvent` lưu `type`, `source`, `occurredAt`, `mileageAtEvent` (nullable), `description`,
liên kết tuỳ chọn tới `RepairOrder`/`MaintenanceRecord`/`Media`. UI hiển thị rõ `source` bằng badge
để người xem phân biệt độ tin cậy — không gộp chung như một loại dữ liệu.

`Vehicle.currentMileage` được cập nhật qua `MileageRecord` (append-only); business rule số 14
(không cho lùi kilomet trừ khi có quyền quản lý + lý do) được thực thi ở `service.ts` của module
`vehicles`, không thực thi bằng CHECK constraint DB (vì cần override có kiểm soát).

## 5. Bảng hỗ trợ hồ sơ sức khỏe

- `Warranty`: `vehicleId`, `partId`/`serviceId` (nullable), `startDate`, `endDate`,
  `terms`, `source` (garage-issued hoặc nhà sản xuất).
- `ShareLink`: `vehicleId`, `token` (unique, random), `expiresAt` (nullable = không hết hạn theo
  thời gian nhưng vẫn thu hồi được), `revokedAt` (nullable), `createdByUserId`. Trang chia sẻ chỉ
  render dữ liệu xe (timeline, bảo hành, lịch bảo dưỡng) — **không bao giờ** trả về thông tin cá
  nhân của chủ xe (tên đầy đủ, số điện thoại, địa chỉ, email) — quy tắc số 17.

## 6. Optimistic concurrency — chi tiết

Ví dụ áp dụng cho `Quotation`:

```prisma
model Quotation {
  id        String   @id @default(cuid())
  garageId  String
  version   Int      @default(1)
  status    QuotationStatus @default(DRAFT)
  // ...
}
```

Update trong `repository.ts`:

```ts
const result = await prisma.quotation.updateMany({
  where: { id, version: expectedVersion },
  data: { ...changes, version: { increment: 1 } },
});
if (result.count === 0) throw new ConflictError("Quotation đã bị thay đổi, vui lòng tải lại.");
```

Cùng pattern cho `RepairOrder`, `InventoryItem`, `Invoice`.

## 7. Transaction bắt buộc (Prisma `$transaction`)

Danh sách khớp với `<data_integrity>` trong `prompt.md`:

- Tạo `Invoice` từ `RepairOrder`.
- Ghi `Payment` và cập nhật số dư `Invoice`.
- Xuất phụ tùng (`InventoryTransaction` loại `ISSUE`) và cập nhật `InventoryItem.quantity`.
- Hủy `WorkTask` và hoàn kho (`InventoryTransaction` loại `RETURN`) nếu nghiệp vụ cho phép.
- Hoàn tất `RepairOrder` và tạo `MaintenanceRecord` + `TimelineEvent`.
- Chuyển quyền sở hữu xe: đóng `VehicleOwnership` hiện tại (`endedAt`), tạo bản ghi mới, tạo
  `TimelineEvent(OWNERSHIP_TRANSFER)`, tạo `AuditLog`.
- Tạo phiên bản báo giá mới và đánh dấu phiên bản cũ `SUPERSEDED`.

## 8. Index & unique constraint quan trọng

- `User.email` unique.
- `Vehicle.vin` unique khi có giá trị (nullable unique — biển số không phải định danh vĩnh viễn,
  quy tắc số 15).
- `(garageId, plateNumber)` không unique tuyệt đối (biển số có thể đổi/cấp lại) nhưng có index để
  tìm kiếm nhanh.
- `(garageId, code)` unique cho `RepairOrder`, `Quotation`, `Invoice` (mã phiếu nội bộ garage).
- `ShareLink.token` unique.
- `InventoryItem` unique theo `(garageId, partId)`.
