# AutoCare — Quy trình nghiệp vụ & State Machine

Mọi state machine dưới đây được triển khai thành hàm transition tập trung trong
`src/modules/<module>/domain.ts` (ví dụ `transitionRepairOrder(current, event, actor)`), có unit
test cho cả transition hợp lệ và không hợp lệ. **Không cho phép cập nhật trạng thái tùy ý** — mọi
update trạng thái phải đi qua hàm transition, không set trực tiếp field `status` từ route/service
khác.

## 1. Quy trình end-to-end

| Bước | Hành động | Thực thể chính | Ai thực hiện |
|---|---|---|---|
| 1 | Đặt lịch | `Appointment` (PENDING) | CUSTOMER |
| 2 | Xác nhận lịch | `Appointment` → CONFIRMED | RECEPTIONIST |
| 3 | Tiếp nhận xe | `Appointment` → ARRIVED, tạo `RepairOrder` (RECEIVED) | RECEPTIONIST |
| 4 | Chụp ảnh & ghi tình trạng ban đầu | `Media`, `MileageRecord` | RECEPTIONIST |
| 5 | Kiểm tra, chẩn đoán | `RepairOrder` → INSPECTING, tạo `Inspection`/`InspectionItem` | TECHNICIAN |
| 6 | Tạo báo giá | `Quotation` (DRAFT → SENT), `QuotationItem` (PENDING) | RECEPTIONIST/GARAGE_MANAGER |
| 7 | Khách duyệt/từ chối từng hạng mục | `QuotationItem` → APPROVED/REJECTED/NEEDS_CLARIFICATION | CUSTOMER |
| 8 | Tạo work task từ hạng mục được duyệt | `WorkTask` (NOT_STARTED) chỉ từ item APPROVED | RECEPTIONIST/GARAGE_MANAGER (hệ thống) |
| 9 | Phân công kỹ thuật viên | `WorkTask.assignedTechnicianId` | RECEPTIONIST/GARAGE_MANAGER |
| 10 | Xuất phụ tùng | `InventoryTransaction` (ISSUE), trừ `InventoryItem.quantity` | TECHNICIAN |
| 11 | Cập nhật tiến độ | `WorkTask` → IN_PROGRESS/PAUSED/..., `WorkLog` | TECHNICIAN |
| 12 | Xử lý phát sinh | `Quotation` version mới (báo giá bổ sung), lặp lại bước 6-11 cho phần phát sinh | RECEPTIONIST + CUSTOMER |
| 13 | Nghiệm thu | `WorkTask` → QUALITY_CHECK → COMPLETED, `RepairOrder` → QUALITY_CHECK | GARAGE_MANAGER/TECHNICIAN |
| 14 | Tạo hóa đơn | `Invoice` (DRAFT → ISSUED) từ `RepairOrder` | CASHIER |
| 15 | Thanh toán | `Payment`, `Invoice` → PARTIALLY_PAID/PAID | CASHIER |
| 16 | Bàn giao xe | `RepairOrder` → READY_FOR_DELIVERY → COMPLETED | RECEPTIONIST/CASHIER |
| 17 | Cập nhật hồ sơ sức khỏe xe | `MaintenanceRecord`, `TimelineEvent` (VERIFIED_GARAGE_RECORD) | Hệ thống (tự động khi RepairOrder COMPLETED) |
| 18 | Tạo lịch bảo hành/bảo dưỡng tiếp theo | `Warranty`, `Vehicle.nextServiceDueAt`/`nextServiceDueMileage` | Hệ thống + GARAGE_MANAGER xác nhận |

## 2. State machine: Appointment

| From | To | Điều kiện | Ai được phép |
|---|---|---|---|
| — | PENDING | Khách tạo lịch mới | CUSTOMER |
| PENDING | CONFIRMED | Garage xác nhận còn slot | RECEPTIONIST, GARAGE_MANAGER |
| PENDING | CANCELLED | Khách hoặc garage hủy trước giờ hẹn | CUSTOMER (lịch của mình), RECEPTIONIST, GARAGE_MANAGER |
| CONFIRMED | ARRIVED | Xe đến tiếp nhận, tạo `RepairOrder` | RECEPTIONIST |
| CONFIRMED | CANCELLED | Hủy trước giờ hẹn theo quy tắc đổi/hủy | CUSTOMER, RECEPTIONIST, GARAGE_MANAGER |
| CONFIRMED | NO_SHOW | Quá giờ hẹn một khoảng cấu hình mà khách không đến | RECEPTIONIST, GARAGE_MANAGER (hoặc job tự động) |
| ARRIVED | COMPLETED | RepairOrder tương ứng đã COMPLETED | Hệ thống (đồng bộ theo RepairOrder) |
| PENDING/CONFIRMED | — (đổi giờ) | Đổi lịch = hủy lịch cũ + tạo lịch mới (giữ lịch sử), theo quy tắc thời gian tối thiểu trước giờ hẹn | CUSTOMER, RECEPTIONIST |

Không cho chuyển từ `COMPLETED`, `CANCELLED`, `NO_SHOW` sang trạng thái khác (trạng thái kết
thúc/terminal).

## 3. State machine: RepairOrder

| From | To | Điều kiện | Ai được phép |
|---|---|---|---|
| — | RECEIVED | Tiếp nhận xe từ Appointment hoặc walk-in | RECEPTIONIST |
| RECEIVED | INSPECTING | Bắt đầu kiểm tra/chẩn đoán | TECHNICIAN, RECEPTIONIST |
| INSPECTING | WAITING_CUSTOMER_APPROVAL | Báo giá đã SENT, chờ khách duyệt hạng mục | Hệ thống (khi Quotation → SENT) |
| WAITING_CUSTOMER_APPROVAL | IN_PROGRESS | Có ít nhất 1 QuotationItem APPROVED và WorkTask được tạo | Hệ thống |
| WAITING_CUSTOMER_APPROVAL | CANCELLED | Khách từ chối toàn bộ hạng mục | CUSTOMER, RECEPTIONIST |
| IN_PROGRESS | WAITING_PARTS | Thiếu phụ tùng, không đủ tồn kho | TECHNICIAN, RECEPTIONIST |
| WAITING_PARTS | IN_PROGRESS | Phụ tùng đã có (nhập kho/điều chỉnh) | RECEPTIONIST, GARAGE_MANAGER |
| IN_PROGRESS | WAITING_CUSTOMER_APPROVAL | Phát sinh mới cần báo giá bổ sung | RECEPTIONIST |
| IN_PROGRESS | QUALITY_CHECK | Toàn bộ WorkTask liên quan đã COMPLETED | TECHNICIAN, GARAGE_MANAGER |
| QUALITY_CHECK | IN_PROGRESS | Nghiệm thu phát hiện lỗi, cần sửa lại | GARAGE_MANAGER |
| QUALITY_CHECK | READY_FOR_DELIVERY | Nghiệm thu đạt | GARAGE_MANAGER |
| READY_FOR_DELIVERY | COMPLETED | Đã bàn giao xe (quy tắc 10: bắt buộc nghiệm thu trước) | RECEPTIONIST, CASHIER |
| RECEIVED/INSPECTING/WAITING_CUSTOMER_APPROVAL/WAITING_PARTS | CANCELLED | Khách hoặc garage hủy đơn (không hard delete — quy tắc 11) | GARAGE_MANAGER |

`COMPLETED` và `CANCELLED` là trạng thái kết thúc — không hard delete, chỉ giữ ở `CANCELLED` khi
ngừng hoạt động (soft-delete semantic, xem `docs/DATABASE.md` mục 1.3).

## 4. State machine: Quotation

| From | To | Điều kiện | Ai được phép |
|---|---|---|---|
| — | DRAFT | Tạo báo giá mới hoặc bản báo giá bổ sung | RECEPTIONIST, GARAGE_MANAGER |
| DRAFT | SENT | Gửi cho khách, không sửa trực tiếp sau khi SENT (quy tắc 2) | RECEPTIONIST, GARAGE_MANAGER |
| SENT | PARTIALLY_APPROVED | Có ít nhất 1 item APPROVED và ít nhất 1 item chưa quyết định/REJECTED | CUSTOMER (qua duyệt item) |
| SENT/PARTIALLY_APPROVED | APPROVED | Tất cả item đã APPROVED | CUSTOMER |
| SENT/PARTIALLY_APPROVED | REJECTED | Tất cả item còn lại đều REJECTED, không còn item PENDING | CUSTOMER |
| SENT/PARTIALLY_APPROVED | EXPIRED | Hết hạn duyệt (job hệ thống theo thời hạn cấu hình) | Hệ thống |
| DRAFT/SENT/PARTIALLY_APPROVED/APPROVED | SUPERSEDED | Tạo phiên bản báo giá mới thay thế (quy tắc 3) | RECEPTIONIST, GARAGE_MANAGER |

Quy tắc bắt buộc: khi `status` không còn `DRAFT`, mọi thay đổi nội dung phải tạo **phiên bản mới**
(`Quotation` mới với `previousVersionId`), không `UPDATE` trực tiếp bản đã `SENT`/`APPROVED`.

## 5. State machine: QuotationItem

| From | To | Điều kiện | Ai được phép |
|---|---|---|---|
| — | PENDING | Tạo cùng lúc với Quotation | RECEPTIONIST, GARAGE_MANAGER |
| PENDING | APPROVED | Khách đồng ý hạng mục | CUSTOMER |
| PENDING | REJECTED | Khách từ chối hạng mục | CUSTOMER |
| PENDING | NEEDS_CLARIFICATION | Khách cần garage giải thích thêm trước khi quyết định | CUSTOMER |
| NEEDS_CLARIFICATION | APPROVED/REJECTED | Sau khi garage phản hồi, khách quyết định | CUSTOMER |

`APPROVED` và `REJECTED` là trạng thái kết thúc cho item đó trong version báo giá hiện tại. Chỉ
item ở trạng thái `APPROVED` mới được chuyển thành `WorkTask` (quy tắc 5).

## 6. State machine: WorkTask

| From | To | Điều kiện | Ai được phép |
|---|---|---|---|
| — | NOT_STARTED | Tạo từ QuotationItem đã APPROVED | RECEPTIONIST, GARAGE_MANAGER (hệ thống) |
| NOT_STARTED | IN_PROGRESS | Kỹ thuật viên bắt đầu | TECHNICIAN (được giao) |
| NOT_STARTED/IN_PROGRESS | WAITING_PARTS | Không đủ tồn kho khi xuất kho | TECHNICIAN |
| WAITING_PARTS | IN_PROGRESS | Phụ tùng đã sẵn sàng | TECHNICIAN |
| IN_PROGRESS | PAUSED | Tạm dừng (hết giờ, ưu tiên việc khác) | TECHNICIAN |
| PAUSED | IN_PROGRESS | Tiếp tục | TECHNICIAN |
| IN_PROGRESS | WAITING_APPROVAL | Cần garage/khách xác nhận trước khi tiếp tục (ví dụ phát sinh) | TECHNICIAN |
| WAITING_APPROVAL | IN_PROGRESS | Đã có phê duyệt (quotation bổ sung APPROVED) | RECEPTIONIST |
| IN_PROGRESS | QUALITY_CHECK | Kỹ thuật viên báo hoàn thành | TECHNICIAN |
| QUALITY_CHECK | IN_PROGRESS | Không đạt, trả lại sửa | GARAGE_MANAGER |
| QUALITY_CHECK | COMPLETED | Đạt nghiệm thu | GARAGE_MANAGER |
| NOT_STARTED/IN_PROGRESS/PAUSED/WAITING_PARTS | CANCELLED | Hủy hạng mục (ví dụ khách đổi ý sau khi đã tạo task — hiếm, cần audit) | GARAGE_MANAGER |

Khi `WorkTask` → `CANCELLED` sau khi đã xuất kho, phải hoàn kho (`InventoryTransaction` loại
`RETURN`) trong transaction nếu nghiệp vụ garage cho phép hoàn.

## 7. State machine: Invoice

| From | To | Điều kiện | Ai được phép |
|---|---|---|---|
| — | DRAFT | Tạo từ RepairOrder ở QUALITY_CHECK/READY_FOR_DELIVERY | CASHIER |
| DRAFT | ISSUED | Phát hành hóa đơn chính thức | CASHIER |
| ISSUED | PARTIALLY_PAID | Có Payment nhưng `amountPaid < total` | Hệ thống (khi ghi Payment) |
| ISSUED/PARTIALLY_PAID | PAID | `amountPaid == total` | Hệ thống |
| ISSUED/PARTIALLY_PAID | OVERDUE | Quá hạn thanh toán theo cấu hình, chưa PAID | Hệ thống (job định kỳ) |
| PAID | REFUNDED | Hoàn tiền toàn bộ, cần phê duyệt | CASHIER (ghi), GARAGE_MANAGER (phê duyệt) |
| DRAFT | CANCELLED | Hủy trước khi phát hành | CASHIER, GARAGE_MANAGER |

`ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE` không cho quay lại `DRAFT`. Mọi thay đổi số dư đi
qua transaction cập nhật cả `Payment` và `Invoice` cùng lúc (quy tắc 19).

## 8. 20 quy tắc nghiệp vụ cốt lõi và nơi thực thi

| # | Quy tắc | Thực thi tại |
|---|---|---|
| 1 | Không bắt đầu hạng mục sửa chữa chưa được khách duyệt | `work-tasks/service.ts` — chỉ tạo `WorkTask` từ `QuotationItem.status = APPROVED` |
| 2 | Báo giá đã gửi/đã duyệt không được sửa trực tiếp | `quotations/domain.ts` — transition chặn `UPDATE` nội dung khi `status != DRAFT` |
| 3 | Thay đổi báo giá đã gửi phải tạo phiên bản mới | `quotations/service.ts::createRevision()` — đánh dấu bản cũ `SUPERSEDED` trong transaction |
| 4 | Mỗi hạng mục báo giá có trạng thái duyệt riêng | `QuotationItemStatus` — mục 5 |
| 5 | Chỉ hạng mục được duyệt mới chuyển thành work task | `work-tasks/service.ts` |
| 6 | Phát sinh sửa chữa phải tạo báo giá bổ sung và được duyệt | `quotations/service.ts::createSupplementary()` gắn `parentQuotationId` |
| 7 | Phụ tùng chỉ trừ kho khi xuất kho hoặc xác nhận sử dụng | `inventory/service.ts::issueForTask()` |
| 8 | Xuất kho và ghi nhận sử dụng phải chạy trong transaction | `inventory/service.ts` dùng `prisma.$transaction` |
| 9 | Không cho tồn kho âm trừ khi cấu hình đặc biệt (MVP: mặc định không cho phép) | `inventory/domain.ts::assertSufficientStock()` — throw nếu `quantity - qty < 0` và garage không bật `allowNegativeStock` |
| 10 | Không bàn giao xe trước khi hoàn tất nghiệm thu | `repair-orders/domain.ts` — transition `READY_FOR_DELIVERY → COMPLETED` yêu cầu đã qua `QUALITY_CHECK` đạt |
| 11 | Không xóa cứng repair order đã hoạt động | `repair-orders/repository.ts` — không có hàm `hardDelete`; chỉ `cancel()` |
| 12 | Không xóa/âm thầm sửa lịch sử bảo dưỡng đã hoàn tất | `maintenance-records/service.ts` — `MaintenanceRecord` immutable sau khi tạo; sửa phải qua `createCorrection()` kèm audit |
| 13 | Điều chỉnh lịch sử phải tạo audit record | `src/lib/audit.ts::recordAudit()` gọi trong mọi service điều chỉnh dữ liệu lịch sử |
| 14 | Kilomet mới không nhỏ hơn lần gần nhất nếu không có lý do + quyền quản lý | `vehicles/service.ts::recordMileage()` — yêu cầu `reason` và role `GARAGE_MANAGER` khi giảm |
| 15 | Biển số không phải định danh vĩnh viễn; hỗ trợ VIN | `Vehicle.plateNumber` (mutable, có lịch sử), `Vehicle.vin` (unique khi có) |
| 16 | Xe đổi chủ nhưng lịch sử kỹ thuật vẫn thuộc xe | `TimelineEvent`/`MaintenanceRecord` liên kết `vehicleId`, không liên kết `customerId` |
| 17 | Trang chia sẻ không lộ dữ liệu cá nhân chủ xe | `vehicle-health/service.ts::getSharedProfile()` — DTO riêng, loại trừ field cá nhân |
| 18 | Share link phải hết hạn và thu hồi được | `ShareLink.expiresAt`, `ShareLink.revokedAt`, kiểm tra ở mọi lượt truy cập |
| 19 | Hóa đơn, thanh toán, tồn kho nhất quán bằng transaction | Mục 7 `docs/DATABASE.md` |
| 20 | Tính tiền dùng số nguyên đơn vị nhỏ nhất, không dùng float JS trực tiếp | `src/lib/money.ts` — mọi phép toán tiền đi qua đây |

## 9. Xử lý phát sinh (supplementary quotation)

Khi kỹ thuật viên phát hiện hư hỏng ngoài báo giá ban đầu trong lúc sửa: `WorkTask` liên quan
chuyển `WAITING_APPROVAL`; RECEPTIONIST tạo `Quotation` mới với `parentQuotationId` trỏ về báo giá
gốc và chỉ chứa hạng mục phát sinh; gửi cho khách; khách duyệt từng hạng mục như luồng chính; hạng
mục được duyệt tạo `WorkTask` mới, task cũ trở lại `IN_PROGRESS`.
