# Mốc 6 — Nghiệm thu, hóa đơn và bàn giao (Quality check, invoice and delivery)

Trạng thái: **Hoàn thành**
Ngày hoàn thành: 2026-07-29

## 1. Mục tiêu
Triển khai toàn bộ quy trình nghiệm thu chất lượng sửa chữa, lập hóa đơn (`Invoice`, `InvoiceItem`), ghi nhận đặt cọc và thanh toán (`Payment`), quản lý công vị thế hóa đơn (`DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`, `REFUNDED`), in/xuất hóa đơn PDF và bàn giao xe an toàn theo quy tắc nghiệp vụ.

## 2. Phạm vi
- Nghiệm thu chất lượng & Bàn giao xe (Quality check & Delivery):
  - Chuyển `RepairOrder` sang `QUALITY_CHECK` khi các task hoàn thành.
  - Phê duyệt nghiệm thu: chuyển sang `READY_FOR_DELIVERY` nếu đạt, trả về `IN_PROGRESS` nếu chưa đạt.
  - Bàn giao xe (`deliverVehicle`): Chuyển từ `READY_FOR_DELIVERY` sang `COMPLETED`, cập nhật `deliveredAt`. Bắt buộc phải qua bước nghiệm thu (Quy tắc 10).
- Lập và Quản lý hóa đơn (`Invoice`, `InvoiceItem`):
  - Tự động tạo hóa đơn nháp (`DRAFT`) từ `RepairOrder` với các item từ báo giá đã duyệt.
  - Mã hóa đơn định dạng `INV-YYYY-XXXX` tự tăng theo từng garage.
  - Xuất hóa đơn (`ISSUED`), cập nhật `issuedAt`. Hủy hóa đơn (`CANCELLED`).
  - Dữ liệu in hóa đơn chuẩn HTML/PDF.
- Thanh toán & Đặt cọc (`Payment`):
  - Ghi nhận thanh toán (`PAYMENT`), đặt cọc (`DEPOSIT`), hoặc hoàn tiền (`REFUND`).
  - Hỗ trợ các hình thức thanh toán: `CASH`, `BANK_TRANSFER`, `CARD`, `OTHER`.
  - Transaction-safe update: Cập nhật đồng thời `Payment` và `Invoice.paidAmount`, tự động tính toán lại trạng thái hóa đơn (`ISSUED` -> `PARTIALLY_PAID` -> `PAID`).
  - Ghi vết Audit log cho mọi giao dịch thanh toán và xuất hóa đơn.

## 3. Quyền hạn (Authorization Matrix)
- `CASHIER`: Lập hóa đơn, phát hành hóa đơn, ghi nhận thanh toán/đặt cọc, thực hiện bàn giao xe.
- `GARAGE_MANAGER`: Nghiệm thu chất lượng, phê duyệt hoàn tiền (`REFUND`), hủy hóa đơn.
- `RECEPTIONIST`: Xem hóa đơn, thực hiện bàn giao xe.
- `CUSTOMER`: Xem danh sách và chi tiết hóa đơn, xem số tiền còn lại phải thanh toán qua portal.

## 4. Kiểm chứng kỹ thuật
- `pnpm test`: Unit tests cho tính toán số dư hóa đơn, quy tắc nghiệm thu và bàn giao.
- `pnpm test:integration`: Integration tests cho luồng Nghiệm thu -> Tạo hóa đơn -> Đặt cọc -> Xuất hóa đơn -> Thanh toán đủ -> Bàn giao xe -> Kiểm tra audit log.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: Pass 100%.
