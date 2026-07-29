# Mốc 9 — Hoàn thiện hệ thống và sẵn sàng Vận hành (Production readiness)

Trạng thái: **Hoàn thành**
Ngày hoàn thành: 2026-07-29

## 1. Mục tiêu
Rà soát toàn bộ hệ thốngAutoCare: Accessibility, QA giao diện responsive, kiểm tra bảo mật, bổ sung dữ liệu seed demo quy mô đầy đủ, E2E test phủ trọn vẹn 16 bước quy trình nghiệp vụ từ Đặt lịch -> Tiếp nhận -> Kiểm tra -> Báo giá -> Công việc & Tồn kho -> Nghiệm thu & Hóa đơn -> Bàn giao -> Hồ sơ sức khỏe xe, hoàn thiện tài liệu hướng dẫn triển khai và vận hành.

## 2. Phạm vi
- Rà soát Accessibility & Responsive QA:
  - Cấu trúc HTML5 chuẩn SEO (mỗi trang 1 thẻ `<h1>`, thẻ `<header>`, `<main>`, `<section>`).
  - Gắn ID duy nhất và nhãn hỗ trợ accessibility (`aria-label`, `aria-describedby`) cho tất cả interactive element.
- Rà soát Bảo mật (Security Review):
  - Rà soát Tenant Isolation: bắt buộc kiểm tra `garageId` ở mọi service & route handler.
  - Bảo vệ dữ liệu cá nhân (PII): Không rò rỉ họ tên, SĐT, địa chỉ qua các public endpoint và ShareLink.
  - Audit trail: Ghi vết Audit log đầy đủ cho mọi thao tác ghi/sửa/xóa quan trọng.
- Dữ liệu Demo Seed (`prisma/seed.ts`):
  - Khởi tạo Garage demo `AutoCare Central` đầy đủ dữ liệu mẫu: Khách hàng, Xe, Lịch hẹn, Lệnh sửa chữa ở các trạng thái, Phụ tùng mẫu, Hóa đơn, Thanh toán, Lịch sử bảo dưỡng và Link chia sẻ.
- Kiểm thử End-to-End (E2E Test):
  - Kịch bản E2E phủ quy trình 16 bước từ phía Khách hàng (Portal) và Phía garage (Nhân viên lễ tân, Kỹ thuật viên, Thu ngân, Quản lý).
- Tài liệu Deployment & Vận hành:
  - Cập nhật `README.md` hướng dẫn cài đặt, cấu hình biến môi trường, seed dữ liệu và chạy test.
  - Hoàn thiện `docs/DEPLOYMENT.md` hướng dẫn Docker Compose, backup/restore database.

## 3. Kiểm chứng kỹ thuật
- `pnpm test`: Unit tests 100% pass.
- `pnpm test:integration`: Integration tests 100% pass.
- `pnpm test:e2e` / `playwright test`: E2E tests pass.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: Pass 100%.
