# AutoCare — Chiến lược test

Công cụ: **Vitest** cho unit và integration test, **Playwright** cho end-to-end test (theo
`<required_tech_stack>`). Test nằm ở `tests/unit/`, `tests/integration/`, `tests/e2e/`, đặt tên
theo module để dễ tra soát (ví dụ `tests/unit/quotations.domain.test.ts`).

## 1. Nguyên tắc

- Unit test nhắm vào `domain.ts` (pure function, không cần DB) — nhanh, chạy trong mọi CI.
- Integration test dùng Vitest + PostgreSQL test database thật (qua Prisma), test `service.ts` và
  `repository.ts` end-to-end trong phạm vi module hoặc liên module (ví dụ appointment → repair
  order).
- E2E test dùng Playwright chạy trên app đã build/dev, mô phỏng người dùng thật qua UI.
- Không tuyên bố test "đã pass" nếu chưa thực sự chạy (xem `<verification_loop>` trong
  `prompt.md`).

## 2. Unit test bắt buộc

| Nhóm | Nội dung cần test |
|---|---|
| Money calculations | Cộng/trừ/nhân số tiền VND (`Int`), tránh sai số, tràn số khi tổng hợp nhiều dòng |
| Discount calculations | Giảm giá theo % và theo số tiền cố định, làm tròn đúng quy tắc (không dùng float) |
| Invoice balances | Tính `balance = total - amountPaid`, chuyển trạng thái theo số dư |
| State transitions | Mọi transition hợp lệ **và không hợp lệ** cho `Appointment`, `RepairOrder`, `Quotation`, `QuotationItem`, `WorkTask`, `Invoice` (xem `docs/WORKFLOWS.md`) |
| Quotation approval | Duyệt từng item, tính lại status tổng (`PARTIALLY_APPROVED`/`APPROVED`/`REJECTED`) |
| Work task creation | Chỉ tạo từ `QuotationItem.APPROVED`; không tạo từ item khác trạng thái |
| Mileage validation | Chặn giảm kilomet không có lý do/quyền; cho phép khi có `reason` + role hợp lệ |
| Maintenance due-date calculation | Tính lịch bảo dưỡng tiếp theo theo thời gian và/hoặc kilomet |
| Permission checks | `rbac.can()` cho từng role × resource theo `docs/RBAC.md` |
| Inventory calculations | Trừ/hoàn kho, chặn tồn kho âm khi không cho phép |

## 3. Integration test bắt buộc

| Luồng | Nội dung xác minh |
|---|---|
| Tenant isolation | User garage A không đọc/sửa được record garage B (403/404, không lộ dữ liệu) |
| Appointment → Repair order | Xác nhận lịch, tiếp nhận tạo đúng `RepairOrder` liên kết `Appointment` |
| Inspection → Quotation | Kết quả kiểm tra sinh đúng hạng mục báo giá liên kết |
| Quotation approval → Work task | Chỉ hạng mục APPROVED tạo `WorkTask`; hạng mục REJECTED/PENDING không tạo |
| Part issue → Inventory transaction | Xuất kho chạy trong transaction, cập nhật đúng `InventoryItem.quantity`, không cho âm |
| Payment → Invoice balance | Ghi `Payment` cập nhật đúng `Invoice.status`/`balance` trong transaction |
| Repair completion → Health record | `RepairOrder.COMPLETED` sinh `MaintenanceRecord` + `TimelineEvent(VERIFIED_GARAGE_RECORD)` |
| Ownership transfer | Chuyển chủ xe đóng ownership cũ, tạo ownership mới, giữ nguyên lịch sử kỹ thuật, tạo audit log |

## 4. E2E flow bắt buộc (Playwright)

Một kịch bản liên tục mô phỏng toàn bộ vòng đời sửa chữa (mapping đúng theo `prompt.md`):

1. Khách hàng đăng nhập.
2. Thêm xe.
3. Đặt lịch.
4. Nhân viên xác nhận lịch.
5. Tiếp nhận xe.
6. Kỹ thuật viên kiểm tra.
7. Garage tạo báo giá.
8. Khách duyệt một phần báo giá (không duyệt toàn bộ).
9. Hệ thống chỉ tạo work task cho phần được duyệt (assert phần chưa duyệt không có task).
10. Kỹ thuật viên hoàn thành công việc được giao.
11. Kho được cập nhật (assert số lượng tồn kho giảm đúng).
12. Thu ngân tạo hóa đơn.
13. Ghi nhận thanh toán.
14. Nghiệm thu.
15. Bàn giao xe.
16. Hồ sơ sức khỏe xe được cập nhật (assert timeline có event mới, nguồn `VERIFIED_GARAGE_RECORD`).

Kịch bản này nên được chia thành các test nhỏ có thể chạy độc lập theo milestone (ví dụ milestone
3 chỉ cần bước 1-5 hoạt động), nhưng phải có **một bản E2E đầy đủ 16 bước** trước khi coi MVP hoàn
thành (Milestone 9).

### Smoke E2E hiện có

`pnpm test:e2e` chạy Chromium với dữ liệu seed, chỉ đọc: login theo vai trò, tìm khách hàng/xe và
mở chi tiết lịch sử xe. Không gọi seed/reset hay mutation; DB local phải đã chạy và có dữ liệu demo.

Ba biến môi trường local (không commit) cần có: `E2E_MANAGER_EMAIL`,
`E2E_RECEPTIONIST_EMAIL`, `E2E_STAFF_PASSWORD`. Artifacts lỗi nằm trong
`playwright-report/` và `test-results/` (đã gitignore).

## 5. Coverage & CI kỳ vọng

- Không đặt ngưỡng coverage cứng ngoài yêu cầu của `prompt.md` (ưu tiên đúng đắn nghiệp vụ hơn %
  coverage hình thức); mọi quy tắc nghiệp vụ ở mục 8 `docs/WORKFLOWS.md` phải có test tương ứng.
- Verification loop bắt buộc sau mỗi thay đổi đáng kể: format → lint → type-check → unit test →
  integration test → build → E2E cho luồng bị ảnh hưởng → kiểm tra migration → kiểm tra quyền →
  kiểm tra seed data (đúng thứ tự trong `<verification_loop>` của `prompt.md`).
- Khi một bước kiểm tra không thể chạy được (ví dụ chưa có DB test), phải ghi rõ lý do và phần
  chưa được xác minh trong báo cáo milestone — không giả định đã pass.
