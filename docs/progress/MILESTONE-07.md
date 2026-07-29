# Mốc 7 — Hồ sơ sức khỏe xe (Vehicle health record)

Trạng thái: **Hoàn thành**
Ngày hoàn thành: 2026-07-29

## 1. Mục tiêu
Triển khai hệ thống Hồ sơ sức khỏe xe toàn diện: tự động ghi nhận lịch sử bảo dưỡng và sự kiện dòng thời gian (`MaintenanceRecord`, `VehicleTimelineEvent`), quản lý bảo hành (`Warranty`), tính toán lịch bảo dưỡng tiếp theo (`nextDueDate`, `nextDueMileageKm`), đánh giá tình trạng các hệ thống xe (`VehicleSystemStatus`), tạo liên kết chia sẻ công khai an toàn (`ShareLink`) với cơ chế bảo vệ quyền riêng tư không lộ PII chủ xe.

## 2. Phạm vi
- Tự động cập nhật hồ sơ khi bàn giao xe (Trigger khi `RepairOrder` `COMPLETED`):
  - Tạo `MaintenanceRecord` nguồn `VERIFIED_GARAGE_RECORD` ghi nhận chi tiết đợt sửa chữa.
  - Tạo `VehicleTimelineEvent` loại `REPAIR`/`MAINTENANCE` bổ sung dòng thời gian sử dụng xe.
  - Cập nhật số km hiện tại (`Vehicle.currentKm`) tuân thủ Quy tắc 14 (không tự giảm km).
  - Tự động tạo `Warranty` cho các phụ tùng/dịch vụ có chế độ bảo hành.
  - Tính toán dự báo thời gian (`nextDueDate`) và số km (`nextDueMileageKm`) bảo dưỡng tiếp theo.
- Lịch sử kỹ thuật bất biến (Quy tắc 12 & 16):
  - Lịch sử kỹ thuật gắn chặt với xe (`vehicleId`), không bị mất khi chuyển nhượng chủ xe.
  - Không cho phép chỉnh sửa/xóa ngầm lịch sử đã tạo; mọi điều chỉnh phải qua `createCorrection()` và để lại audit trail (Quy tắc 13).
- Đánh giá tình trạng hệ thống xe (`VehicleSystemStatus`):
  - Tổng hợp tình trạng (`GOOD`, `FAIR`, `POOR`, `UNKNOWN`) của 11 hệ thống chính (Động cơ, Hộp số, Phanh, Treo, Lái, Điện, Ắc quy, Lốp, Điều hòa, Khung gầm...).
- Chia sẻ hồ sơ an toàn (`ShareLink` & Privacy Controls):
  - Tạo token chia sẻ hồ sơ xe có thời hạn (`expiresAt`).
  - Cho phép thu hồi link chia sẻ bất kỳ lúc nào (`revokedAt`, Quy tắc 18).
  - Trang chia sẻ công khai DTO riêng: **Tuyệt đối không lộ thông tin cá nhân chủ xe** (họ tên, SĐT, email, địa chỉ) (Quy tắc 17).

## 3. Quyền hạn (Authorization Matrix)
- `GARAGE_MANAGER` / `RECEPTIONIST`: Tạo link chia sẻ, cập nhật trạng thái hệ thống xe, tạo điều chỉnh lịch sử.
- `TECHNICIAN`: Xem hồ sơ sức khỏe xe để phục vụ chẩn đoán.
- `CUSTOMER`: Xem toàn bộ hồ sơ sức khỏe xe của mình qua portal `/tai-khoan/xe/[id]`, tạo và quản lý link chia sẻ xe.
- `GUEST` (Public viewer via link): Xem trang hồ sơ sức khỏe xe qua `/so-suc-khoe/chia-se/[token]` (đã lọc PII).

## 4. Kiểm chứng kỹ thuật
- `pnpm test`: Unit tests cho privacy DTO filtering (bảo mật PII), tính toán ngày/km bảo dưỡng tiếp theo, hạn bảo hành.
- `pnpm test:integration`: Integration tests cho luồng Bàn giao xe -> Tự động sinh MaintenanceRecord/TimelineEvent -> Sinh ShareLink -> Đọc public health record không lộ PII -> Thu hồi ShareLink.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: Pass 100%.
