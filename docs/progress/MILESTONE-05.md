# Mốc 5 — Quản lý công việc và tồn kho (Work management and inventory)

Trạng thái: **Hoàn thành**
Ngày hoàn thành: 2026-07-29

## 1. Mục tiêu
Triển khai toàn bộ quy trình quản lý công việc sửa chữa (`WorkTask`, `WorkLog`, phân công kỹ thuật viên, Kanban) và quản lý phụ tùng/kho (`Part`, `InventoryTransaction`, cảnh báo tồn kho thấp, xuất kho transaction-safe, không cho tồn kho âm, báo giá bổ sung khi có phát sinh).

## 2. Phạm vi
- Quản lý công việc (`WorkTask`):
  - Tự động tạo `WorkTask` (trạng thái `NOT_STARTED`) CHỈ từ các `QuotationItem` đã ở trạng thái `APPROVED` khi Quotation được phê duyệt/xác nhận.
  - Phân công kỹ thuật viên (`assignedToId`).
  - Chuyển trạng thái `WorkTask` (NOT_STARTED, WAITING_PARTS, IN_PROGRESS, PAUSED, WAITING_APPROVAL, QUALITY_CHECK, COMPLETED, CANCELLED).
  - Ghi nhận nhật ký công việc (`WorkLog`: ghi chú, số phút thực hiện).
  - Bảng Kanban và danh sách công việc theo trạng thái cho garage.
- Quản lý phụ tùng & tồn kho (`Part`, `InventoryTransaction`):
  - Danh mục phụ tùng (SKU, tên, đơn vị, giá vốn, giá bán, số lượng tồn kho, ngưỡng cảnh báo tồn kho thấp).
  - Xuất kho phụ tùng cho công việc sửa chữa (`ISSUE`) trong transaction safe:
    - Kiểm tra số lượng tồn kho không âm ngoại trừ trường hợp garage bật `allowNegativeStock`.
    - Tạo `InventoryTransaction` loại `ISSUE` (số lượng âm) và cập nhật `Part.quantityInStock`.
    - Nếu không đủ hàng, tự động đưa `WorkTask` về `WAITING_PARTS` hoặc thông báo lỗi xuất kho.
  - Nhập kho (`RECEIPT`), điều chỉnh (`ADJUSTMENT`), hoàn kho (`RETURN`).
  - Cảnh báo tồn kho thấp khi `quantityInStock <= lowStockThreshold`.
- Báo giá bổ sung (Supplementary Quotation):
  - Khi phát hiện hư hỏng phát sinh: `WorkTask` chuyển `WAITING_APPROVAL`.
  - Tạo `Quotation` bổ sung với `isSupplementary = true` và `parentQuotationId`.
  - Sau khi khách duyệt hạng mục bổ sung, tự động tạo `WorkTask` mới và đưa task cũ về lại `IN_PROGRESS`.

## 3. Quyền hạn (Authorization Matrix)
- `GARAGE_MANAGER`: Phân công task, quản lý phụ tùng, nhập kho/điều chỉnh, phê duyệt task cancel/return.
- `TECHNICIAN`: Xem task được giao/toàn garage, cập nhật trạng thái task của mình, ghi `WorkLog`, yêu cầu xuất kho phụ tùng.
- `RECEPTIONIST`: Xem tiến độ công việc, tạo báo giá bổ sung khi có phát sinh.
- `CUSTOMER`: Không trực tiếp thao tác WorkTask/Kho, chỉ duyệt báo giá bổ sung qua portal.

## 4. Kiểm chứng kỹ thuật
- `pnpm test`: Unit tests cho money, work task creation rules, inventory stock assertions.
- `pnpm test:integration`: Integration tests cho flow Quotation -> WorkTask -> Inventory ISSUE transaction -> Stock check -> Low stock alert -> Supplementary quotation.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: Pass 100%.
