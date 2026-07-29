# Mốc 8 — Dashboard và Báo cáo (Dashboard and reports)

Trạng thái: **Hoàn thành**
Ngày hoàn thành: 2026-07-29

## 1. Mục tiêu
Triển khai Dashboard vận hành tập trung cho Garage (`/bang-dieu-khien`) cùng hệ thống báo cáo chuyên sâu: báo cáo doanh thu, báo cáo dịch vụ phổ biến, báo cáo hiệu suất kỹ thuật viên, báo cáo giá trị tồn kho và tối ưu hóa truy vấn truy xuất dữ liệu.

## 2. Phạm vi
- Dashboard vận hành (`Operational Dashboard` tại `/bang-dieu-khien`):
  - Các chỉ số KPI tổng quan trong ngày/tháng:
    - Lịch hẹn hôm nay (`PENDING`, `CONFIRMED`, `ARRIVED`).
    - Lệnh sửa chữa đang hoạt động (`RECEIVED`, `INSPECTING`, `IN_PROGRESS`, `QUALITY_CHECK`, `READY_FOR_DELIVERY`).
    - Doanh thu thực thu trong tháng (VND từ các Payment).
    - Cong nợ / Tiền chờ thanh toán từ các hóa đơn đã xuất (`ISSUED`, `PARTIALLY_PAID`).
    - Số lượng phụ tùng dưới ngưỡng tồn kho tối thiểu (`quantityInStock <= lowStockThreshold`).
  - Danh sách hoạt động sửa chữa mới nhất.
  - Phím tắt thao tác nhanh (Tiếp nhận xe, Tạo báo giá, Xuất hóa đơn, Nhập kho).
- Hệ thống báo cáo chuyên sâu (`Reports Service`):
  - Báo cáo doanh thu (`getRevenueReport`): Tổng hợp doanh thu theo ngày/tháng, phân loại theo hình thức thanh toán (`CASH`, `BANK_TRANSFER`, `CARD`).
  - Báo cáo dịch vụ (`getServiceReport`): Top dịch vụ sửa chữa thực hiện nhiều nhất, doanh thu theo dịch vụ, thời gian sửa chữa trung bình.
  - Báo cáo kỹ thuật viên (`getTechnicianReport`): Thống kê số công việc hoàn thành theo kỹ thuật viên, tổng thời gian thực hiện ghi nhận qua `WorkLog`.
  - Báo cáo kho (`getInventoryReport`): Tổng giá trị vốn kho, tổng giá trị bán niêm yết, tổng hợp biến động xuất/nhập/điều chỉnh/hoàn kho.
- Tối ưu hóa truy vấn (`Query Optimization`):
  - Tận dụng index đa cột có sẵn trên Prisma schema (`garageId` + `status`, `garageId` + `paidAt`).
  - Sử dụng `aggregate` / `groupBy` của Prisma tránh truy vấn vòng lặp N+1.

## 3. Quyền hạn (Authorization Matrix)
- `GARAGE_MANAGER`: Xem toàn bộ dashboard vận hành, báo cáo doanh thu, dịch vụ, kỹ thuật viên, kho và log hệ thống (`report:read`).
- `CASHIER`: Xem dashboard doanh thu và hóa đơn công nợ.
- `RECEPTIONIST`: Xem dashboard lịch hẹn và lệnh sửa chữa đang tiến hành.
- `TECHNICIAN`: Xem dashboard danh sách công việc cá nhân.

## 4. Kiểm chứng kỹ thuật
- `pnpm test`: Unit tests cho tính toán chỉ số báo cáo, lọc theo khoảng thời gian, tổng hợp doanh thu.
- `pnpm test:integration`: Integration tests kiểm tra các truy vấn báo cáo trên dữ liệu thực tế.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: Pass 100%.
