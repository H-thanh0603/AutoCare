# AutoCare — Authorization (RBAC) matrix

## 1. Nguyên tắc chung

- Authorization **luôn kiểm tra ở backend** (service layer), không chỉ ẩn nút ở UI và không chỉ
  đặt trong middleware. Middleware chỉ làm việc thô: redirect chưa đăng nhập, chặn truy cập route
  sai khu vực (`/portal` vs `/dashboard`). Kiểm tra quyền thật (ai được đọc/sửa record nào) nằm
  trong `service.ts` của từng module, gọi qua `src/lib/rbac.ts`.
- **Tenant isolation**: `garageId` dùng để scope truy vấn luôn lấy từ session (`GarageMember`
  liên kết `User` hiện tại với garage), **không bao giờ** tin `garageId` client gửi lên.
- `CUSTOMER` chỉ truy cập xe mình sở hữu hiện tại (`VehicleOwnership.currentOwnerId`) hoặc được
  cấp quyền xem qua chia sẻ nội bộ (nếu có, ngoài `ShareLink` công khai).
- `PLATFORM_ADMIN`: MVP chỉ chuẩn bị cấu trúc quyền (permission constant, kiểm tra role tồn tại),
  chưa cần route/UI hoàn chỉnh.
- Ký hiệu quyền: **C**reate, **R**ead, **U**pdate, **D**elete. "—" = không có quyền. Ghi chú thêm
  khi quyền có điều kiện (own/assigned/garage-scope).

## 2. Ma trận theo nhóm resource

| Resource | CUSTOMER | RECEPTIONIST | TECHNICIAN | CASHIER | GARAGE_MANAGER | PLATFORM_ADMIN |
|---|---|---|---|---|---|---|
| Hồ sơ cá nhân (`User`) | CRU (chính mình) | R (khách hàng liên hệ) | — | — | CRUD (nhân sự garage) | CRUD (toàn hệ thống) |
| Garage / GarageMember | — | R | R | R | CRUD | CRUD |
| Customer | R (chính mình) | CRUD | R (khi liên quan work task) | R (khi lập hóa đơn) | CRUD | R |
| Vehicle | CRU (xe mình sở hữu) | CRUD | R (xe có work task) | R | CRUD | R |
| VehicleOwnership | R (lịch sử xe mình) | C, R | — | — | CRUD | R |
| Appointment | CRU (lịch của mình, theo quy tắc đổi/hủy) | CRUD | R | — | CRUD | R |
| RepairOrder | R (đơn của xe mình) | CRU | R (đơn được giao) | R | CRUD (không hard delete) | R |
| Inspection / InspectionItem | R | CRU | CRU (đơn được giao) | — | CRUD | R |
| Quotation | R, **approve/reject item** (đơn của mình) | CR (tạo/gửi) | R | R | CRUD | R |
| QuotationItem status | U (chỉ APPROVED/REJECTED do khách, cho item PENDING/NEEDS_CLARIFICATION) | CU | R | — | CRUD | R |
| WorkTask | R (qua RepairOrder của mình) | CR | RU (task được giao: cập nhật trạng thái, log) | — | CRUD | R |
| WorkLog | R | R | CR (task của mình) | — | R | R |
| Service (catalog) | R | R | R | R | CRUD | R |
| Part (catalog) | — | R | R | R | CRUD | R |
| InventoryItem / InventoryTransaction | — | R | **C** (issue cho task được giao) | R | CRUD | R |
| Invoice | R (hóa đơn của mình) | R | — | CRUD | CRUD | R |
| Payment | R (của mình) | — | — | CR | CRUD | R |
| MaintenanceRecord | R (xe của mình) | R | C (khi hoàn tất work task) | — | CRUD | R |
| TimelineEvent (vehicle-health) | R (xe của mình), C (`OWNER_PROVIDED_RECORD`) | R | — | — | CRUD | R |
| Warranty | R (xe của mình) | CR | — | — | CRUD | R |
| ShareLink | CRUD (chỉ share link của xe mình) | — | — | — | R (audit) | R |
| Notification | R, U (đánh dấu đã đọc — của mình) | R, U (của mình) | R, U (của mình) | R, U (của mình) | R, U (của mình) | R |
| Media | R (liên quan xe/RO của mình), C (đính kèm khi cần) | CRUD | CR (ảnh công việc được giao) | R | CRUD | R |
| AuditLog | — | — | — | — | R | R |
| Report | — | — | — | R (báo cáo doanh thu/thanh toán liên quan) | CRUD (xem) | R |

Ghi chú:

- "Đơn/xe của mình" luôn nghĩa là: `Vehicle.currentOwnerId === session.customerId` HOẶC
  `RepairOrder.customerId === session.customerId` — kiểm tra tại `service.ts`, ví dụ
  `vehicles/authorization.ts::assertCustomerOwnsVehicle()`.
- "Task được giao" nghĩa là `WorkTask.assignedTechnicianId === session.userId`.
- TECHNICIAN không có quyền C/U/D trên `Quotation`/`Invoice`/`Payment` — chỉ tương tác qua
  `WorkTask` và `InventoryTransaction` xuất kho cho công việc của mình.
- CASHIER không sửa `RepairOrder`/`WorkTask` — chỉ làm việc ở khâu nghiệm thu-hóa đơn-thanh toán-
  bàn giao.
- GARAGE_MANAGER có quyền CRUD trong toàn bộ garage của mình, nhưng vẫn phải tuân thủ business
  rule (không sửa báo giá đã duyệt trực tiếp, không hard-delete RepairOrder...) — quyền role không
  vượt qua state machine.

## 3. Quyền theo hành động nghiệp vụ nhạy cảm (không map 1-1 vào CRUD)

| Hành động | Ai được thực hiện |
|---|---|
| Duyệt/từ chối hạng mục báo giá | CUSTOMER (chủ xe của RepairOrder), hoặc GARAGE_MANAGER thực hiện thay khi có ủy quyền ghi nhận rõ (audit log) |
| Gửi báo giá cho khách (SENT) | RECEPTIONIST, GARAGE_MANAGER |
| Tạo phiên bản báo giá mới | RECEPTIONIST, GARAGE_MANAGER |
| Tạo work task từ quotation item | RECEPTIONIST, GARAGE_MANAGER (hệ thống tự tạo khi item APPROVED, nhưng thao tác kích hoạt do người có quyền này gọi) |
| Phân công kỹ thuật viên | RECEPTIONIST, GARAGE_MANAGER |
| Xuất kho / điều chỉnh kho | TECHNICIAN (xuất cho task của mình), RECEPTIONIST/GARAGE_MANAGER (điều chỉnh, nhập kho) |
| Ghi đè kilomet thấp hơn lần trước | GARAGE_MANAGER (bắt buộc kèm lý do, tạo AuditLog) — RECEPTIONIST/TECHNICIAN không được override |
| Chuyển quyền sở hữu xe | RECEPTIONIST, GARAGE_MANAGER |
| Tạo/thu hồi share link | CUSTOMER (chủ xe), GARAGE_MANAGER (thu hồi khi cần, ví dụ nghi ngờ lộ thông tin) |
| Hoàn tiền (refund) | CASHIER (ghi nhận), GARAGE_MANAGER (phê duyệt) |
| Bàn giao xe | RECEPTIONIST, CASHIER, GARAGE_MANAGER — chỉ khi `status = READY_FOR_DELIVERY` (đã nghiệm thu) |

## 4. Kiểm tra bắt buộc ở mọi service method

Mỗi hàm trong `service.ts` xử lý mutation hoặc đọc dữ liệu nhạy cảm phải:

1. Lấy session hiện tại (`userId`, `role`, `garageId` nếu là nhân sự garage, `customerId` nếu là
   CUSTOMER).
2. Gọi `rbac.can(session, action, resource)` hoặc hàm authorization riêng của module.
3. Nếu không đủ quyền → throw `ForbiddenError` (không lộ chi tiết dữ liệu người khác trong message).
4. Nếu resource thuộc garage khác → xử lý như không tồn tại (`NotFoundError`), không lộ rằng dữ
   liệu tồn tại ở garage khác — đây là kiểm tra bắt buộc cho tenant isolation.

Ít nhất một integration test phải xác minh: user của garage A gọi API với id thuộc garage B →
nhận `NotFoundError`/403, không nhận được dữ liệu (xem `docs/TESTING.md`).
