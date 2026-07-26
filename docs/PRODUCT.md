# AutoCare — Tổng quan sản phẩm

> Nguồn đặc tả duy nhất: `prompt.md` (xem giả định D1 trong `docs/DECISIONS.md` — file
> `AutoCare_Garage_Vehicle_Health_Record_Project.md` được nhắc trong `prompt.md` không tồn tại
> trong repository; toàn bộ nội dung dưới đây được trích xuất và diễn giải từ `prompt.md`).

## 1. AutoCare là gì

AutoCare là hệ thống quản lý garage ô tô/xe máy kết hợp **hồ sơ sức khỏe điện tử** theo suốt vòng
đời của xe. Sản phẩm giải quyết hai vấn đề song song:

- Vận hành garage: tiếp nhận, kiểm tra, báo giá, sửa chữa, kho phụ tùng, hóa đơn, bàn giao.
- Hồ sơ xe xuyên suốt: lịch sử bảo dưỡng, sửa chữa, phụ tùng, bảo hành, chủ sở hữu — độc lập với
  việc xe có đổi chủ hay không.

MVP phục vụ **một garage duy nhất**, nhưng dữ liệu và authorization được thiết kế sẵn sàng cho
nhiều garage (SaaS đa garage) trong tương lai (xem `docs/DECISIONS.md` D5).

## 2. Người dùng

| Người dùng | Vai trò hệ thống | Nhu cầu chính |
|---|---|---|
| Chủ xe | `CUSTOMER` | Theo dõi xe, đặt lịch, duyệt báo giá, xem tiến độ và hóa đơn |
| Nhân viên tiếp nhận | `RECEPTIONIST` | Quản lý lịch hẹn, khách hàng, xe, phiếu tiếp nhận |
| Kỹ thuật viên | `TECHNICIAN` | Xem công việc được giao, cập nhật tiến độ, ghi nhận phụ tùng dùng |
| Thu ngân | `CASHIER` | Tạo hóa đơn, ghi nhận thanh toán, xử lý bàn giao |
| Quản lý garage | `GARAGE_MANAGER` | Toàn quyền dữ liệu trong garage, xem báo cáo |
| Quản trị viên nền tảng | `PLATFORM_ADMIN` | Chuẩn bị cấu trúc quyền cho tương lai đa garage; **không có UI hoàn chỉnh trong MVP** |

## 3. Hai khu vực giao diện

### 3.1 Customer Portal (`src/app/portal/*`)

Không gian dành cho chủ xe, thân thiện, không dùng thuật ngữ kỹ thuật mà không giải thích:

- Đăng nhập, quản lý hồ sơ cá nhân.
- Thêm và quản lý xe của mình; xem hồ sơ xe như một "hồ sơ cá nhân" của xe.
- Đặt lịch, đổi/hủy lịch theo quy tắc.
- Xem phiếu tiếp nhận, kết quả kiểm tra, ảnh trước/sau.
- Duyệt hoặc từ chối **từng hạng mục** báo giá (không duyệt cả báo giá theo khối).
- Theo dõi tiến độ sửa chữa, xem hóa đơn, lịch sử bảo dưỡng, lịch bảo hành.
- Nhận thông báo trong ứng dụng.
- Tạo link chia sẻ hồ sơ xe (có kiểm soát, có thể hết hạn/thu hồi).

### 3.2 Garage Dashboard (`src/app/dashboard/*`)

Không gian vận hành cho nhân viên garage, tối ưu thao tác nhanh trên tablet/desktop:

- Dashboard tổng quan, tìm kiếm nhanh theo số điện thoại/biển số/mã phiếu.
- Quản lý khách hàng, xe, lịch hẹn (calendar).
- Tạo phiếu tiếp nhận, checklist tình trạng, ghi kilomet/nhiên liệu, upload ảnh.
- Kiểm tra/chẩn đoán, tạo và quản lý phiên bản báo giá, gửi báo giá, theo dõi phê duyệt.
- Tạo work task từ hạng mục được duyệt, phân công kỹ thuật viên, Kanban tiến độ.
- Quản lý dịch vụ, phụ tùng, kho (nhập/xuất/điều chỉnh), cảnh báo tồn kho thấp.
- Nghiệm thu, tạo hóa đơn, ghi nhận đặt cọc/thanh toán, bàn giao xe.
- Cập nhật hồ sơ sức khỏe xe, xem báo cáo cơ bản, audit log.

## 4. Quy trình nghiệp vụ cốt lõi (end-to-end)

```
Đặt lịch → Xác nhận lịch → Tiếp nhận xe → Chụp ảnh & ghi nhận tình trạng ban đầu
→ Kiểm tra, chẩn đoán → Tạo báo giá → Khách duyệt/từ chối từng hạng mục
→ Tạo work task từ hạng mục được duyệt → Phân công kỹ thuật viên → Xuất phụ tùng
→ Cập nhật tiến độ → Xử lý phát sinh bằng báo giá bổ sung → Nghiệm thu
→ Tạo hóa đơn → Thanh toán → Bàn giao xe → Cập nhật hồ sơ sức khỏe xe
→ Tạo lịch bảo hành và bảo dưỡng tiếp theo
```

Chi tiết state machine của từng thực thể trong quy trình này nằm ở `docs/WORKFLOWS.md`.

## 5. Giá trị khác biệt: Hồ sơ sức khỏe xe

Đây là tính năng tạo khác biệt sản phẩm (xem chi tiết cấu trúc dữ liệu ở `docs/DATABASE.md`):

- Timeline hợp nhất mọi sự kiện của xe (bảo dưỡng, sửa chữa, thay phụ tùng, tai nạn, cứu hộ, đăng
  kiểm, bảo hiểm, thay dầu/lốp/ắc-quy, cập nhật kilomet, chuyển chủ...).
- Mỗi bản ghi có nguồn rõ ràng: `VERIFIED_GARAGE_RECORD`, `OWNER_PROVIDED_RECORD`,
  `IMPORTED_RECORD` — không đánh đồng độ tin cậy.
- Lịch sử kỹ thuật thuộc về **xe**, không thuộc về chủ xe hiện tại — khi xe đổi chủ, lịch sử vẫn
  giữ nguyên.
- Không tuyên bố hồ sơ là chứng nhận an toàn tuyệt đối; mọi điểm sức khỏe (nếu triển khai) phải ghi
  rõ "chỉ mang tính tham khảo".

## 6. Phạm vi MVP

### Trong phạm vi (bắt buộc hoàn thành)

**Customer Portal**: đăng nhập; hồ sơ cá nhân; CRUD xe của mình; xem hồ sơ xe; đặt/đổi/hủy lịch;
xem phiếu tiếp nhận, kết quả kiểm tra, báo giá; duyệt/từ chối từng hạng mục báo giá; xem tiến độ,
ảnh trước/sau, hóa đơn, lịch sử bảo dưỡng, lịch bảo hành; thông báo trong app; tạo link chia sẻ.

**Garage Dashboard**: dashboard tổng quan; quản lý khách hàng/xe/lịch hẹn; phiếu tiếp nhận; ghi
kilomet/nhiên liệu; checklist tình trạng; upload ảnh; kiểm tra/chẩn đoán; báo giá và phiên bản báo
giá; gửi báo giá; theo dõi phê duyệt; work task; phân công kỹ thuật viên; Kanban; quản lý dịch
vụ/phụ tùng; nhập/xuất/điều chỉnh kho; cảnh báo tồn kho thấp; nghiệm thu; hóa đơn; đặt cọc/thanh
toán; bàn giao; cập nhật hồ sơ sức khỏe; báo cáo cơ bản; audit log.

### Ngoài phạm vi MVP (không triển khai)

- Marketplace nhiều garage.
- AI chẩn đoán lỗi, kết nối OBD-II.
- Ứng dụng native (iOS/Android).
- Chat realtime phức tạp.
- Bảo hiểm, cứu hộ, mua bán xe.
- Subscription billing / quản trị SaaS đầy đủ.
- Hệ thống kế toán đầy đủ.
- Tích hợp mọi cổng thanh toán (MVP chỉ cần ghi nhận thanh toán, không bắt buộc cổng thanh toán
  online cụ thể — xem giả định trong `docs/progress/MILESTONE-00.md`).

## 7. Tiêu chí "MVP hoàn thành"

MVP chỉ được xem là hoàn thành khi một garage thật có thể thực hiện trọn vẹn quy trình: Đặt lịch →
Tiếp nhận → Kiểm tra → Báo giá → Khách duyệt → Sửa chữa → Xuất kho → Nghiệm thu → Hóa đơn → Thanh
toán → Bàn giao → Hồ sơ sức khỏe xe, với authorization đúng vai trò và dữ liệu toàn vẹn ở mọi bước.
