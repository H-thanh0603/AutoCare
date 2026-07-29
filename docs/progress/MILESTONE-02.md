# Mốc 2 — Khách hàng và xe

Trạng thái: **Hoàn thành**
Ngày bắt đầu: 2026-07-27
Ngày hoàn thành: 2026-07-29

## 1. Mục tiêu

Biến hai trang danh sách chỉ-đọc của Mốc 1 (`/khach-hang`, `/xe`) thành module
nghiệp vụ đầy đủ: tạo/sửa/xóa mềm khách hàng và xe, lịch sử chủ sở hữu, lịch sử
số km, tìm kiếm, và trang chi tiết xe kèm timeline cơ bản.

Đây là nền dữ liệu cho mọi mốc sau: không có khách hàng và xe thì không có lịch
hẹn, lệnh sửa chữa, báo giá hay hồ sơ sức khỏe xe.

## 2. Phạm vi

| Nhóm | Nội dung |
| --- | --- |
| Khách hàng | Tạo, sửa, xóa mềm, tìm kiếm, trang chi tiết |
| Xe | Tạo (kèm gán chủ sở hữu), sửa, xóa mềm, tìm kiếm, trang chi tiết |
| Chủ sở hữu | Lịch sử `VehicleOwnership`, chuyển chủ sở hữu, audit log |
| Số km | Ghi nhận `MileageLog`, quy tắc không giảm, override có lý do + quyền quản lý, audit log |
| Timeline | Đọc `VehicleTimelineEvent`; ghi sự kiện `MILEAGE_UPDATE` và `OWNERSHIP_TRANSFER` |
| Kiểm thử | Unit cho quy tắc số km + schema; integration cho CRUD, tenant isolation, chuyển chủ, override km |

## 3. Ngoài phạm vi

- Lịch hẹn và tiếp nhận xe (Mốc 3).
- Kiểm tra xe, báo giá (Mốc 4).
- Ảnh/tài liệu đính kèm xe (`Media`) — Mốc 3 khi có ảnh tiếp nhận.
- Timeline đầy đủ 13 loại sự kiện, warranty, next service, share link (Mốc 7).
- Khách hàng tự thêm xe từ portal — portal Mốc 2 vẫn chỉ đọc.
- Gộp trùng khách hàng (merge duplicate), import CSV.

## 4. Giả định

1. **Số điện thoại là khóa nhận diện khách trong một gara.** Ràng buộc
   `@@unique([garageId, phone])` đã có trong schema; cùng một người có thể là
   khách của nhiều gara nên trùng số giữa các gara là hợp lệ.
2. **Xe không thuộc gara.** Phạm vi gara của xe đi qua chủ sở hữu hiện tại
   (`VehicleOwnership -> Customer.garageId`). Xe chỉ được gara khác phục vụ sẽ
   đọc ra `NotFoundError`.
3. **Xóa là xóa mềm** (`deletedAt`). Không xóa cứng vì lịch sử kỹ thuật và hóa
   đơn tham chiếu tới các bản ghi này.
4. **Biển số không phải khóa vĩnh viễn.** Không đặt unique trên `licensePlate`;
   VIN mới là unique toàn hệ thống và là tùy chọn.
5. **Chuyển chủ sở hữu giữ lại lịch sử kỹ thuật của xe.** Chủ cũ mất quyền đọc
   từ portal (ownership đã kết thúc), nhưng dữ liệu không bị xóa.
6. **`currentKm` là giá trị denormalize** của lần đọc odometer mới nhất; nguồn
   sự thật là `MileageLog`.

## 5. Data model thay đổi

Không thêm bảng mới. Migration
`20260727220000_enforce_single_current_vehicle_ownership` thêm partial unique
index để mỗi xe chỉ có một `VehicleOwnership` đang hiệu lực. Các bảng nghiệp vụ
đã có từ Mốc 1: `customers`, `vehicles`, `vehicle_ownerships`, `mileage_logs`,
`vehicle_timeline_events`, `audit_logs`.

## 6. Routes và server actions

### Trang (RSC)

| Route | Quyền | Nội dung |
| --- | --- | --- |
| `/khach-hang?q=` | `customer:read` | Danh sách + ô tìm kiếm |
| `/khach-hang/moi` | `customer:write` | Form tạo khách |
| `/khach-hang/[id]` | `customer:read` | Chi tiết khách, xe đang sở hữu, lệnh sửa chữa |
| `/khach-hang/[id]/sua` | `customer:write` | Form sửa khách |
| `/xe?q=` | `vehicle:read` | Danh sách + ô tìm kiếm |
| `/xe/moi` | `vehicle:write` | Form tạo xe + chọn chủ sở hữu |
| `/xe/[id]` | `vehicle:read` | Chi tiết xe, lịch sử km, lịch sử chủ, timeline |
| `/xe/[id]/sua` | `vehicle:write` | Form sửa xe |

### Server actions

| Action | Quyền | Quy tắc chính |
| --- | --- | --- |
| `createCustomerAction` | `customer:write` | Trùng `(garageId, phone)` → lỗi nghiệp vụ |
| `updateCustomerAction` | `customer:write` | Chỉ trong gara của session |
| `deleteCustomerAction` | `customer:write` | Chặn nếu còn lệnh sửa chữa đang mở |
| `createVehicleAction` | `vehicle:write` | Bắt buộc có chủ sở hữu là khách của gara; VIN trùng → lỗi nghiệp vụ |
| `updateVehicleAction` | `vehicle:write` | Chỉ xe do khách của gara đang sở hữu |
| `deleteVehicleAction` | `vehicle:write` | Chặn nếu còn lệnh sửa chữa đang mở |
| `transferOwnershipAction` | `vehicle:write` | Kết thúc ownership cũ + tạo mới trong 1 transaction, audit + timeline |
| `recordMileageAction` | `vehicle:write` | Không cho giảm km; giảm phải có lý do **và** vai trò quản lý; audit + timeline |

## 7. Authorization matrix

| Thao tác | Lễ tân | Kỹ thuật viên | Thu ngân | Quản lý gara | Khách hàng |
| --- | --- | --- | --- | --- | --- |
| Đọc khách hàng | ✅ | ✅ | ✅ | ✅ | ❌ (portal riêng) |
| Ghi khách hàng | ✅ | ❌ | ❌ | ✅ | ❌ |
| Đọc xe | ✅ | ✅ | ✅ | ✅ | ✅ (xe của mình) |
| Ghi xe | ✅ | ❌ | ❌ | ✅ | ❌ (Mốc 2) |
| Chuyển chủ sở hữu | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ghi số km | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Override số km giảm** | ❌ | ❌ | ❌ | ✅ | ❌ |

Override số km là kiểm tra vai trò riêng (`requireGarageRole(GARAGE_MANAGER)`),
không nằm trong permission map, vì đây là ngoại lệ với quy tắc dữ liệu.

## 8. Validation

Zod, chạy cả client (UX) và server (thẩm quyền):

- `customerSchema`: `name` 2–120 ký tự; `phone` theo `phoneSchema` của Mốc 1
  (`0xxxxxxxxx` hoặc `+84xxxxxxxxx`); `email` tùy chọn; `address`, `note` tùy chọn.
- `vehicleSchema`: `licensePlate` 5–15 ký tự, chuẩn hóa in hoa và bỏ khoảng
  trắng; `brand`, `model` bắt buộc; `vin` tùy chọn 11–17 ký tự chữ-số;
  `year` 1950–(năm hiện tại + 1); `currentKm` 0–2.000.000.
- `mileageSchema`: `mileageKm` số nguyên 0–2.000.000; `overrideReason` tối thiểu
  10 ký tự khi có.
- `transferOwnershipSchema`: `customerId` bắt buộc, `note` tùy chọn.

## 9. Tests

| Loại | Nội dung |
| --- | --- |
| Unit | Quy tắc số km: tăng OK, bằng OK, giảm không lý do → lỗi, giảm có lý do nhưng không phải quản lý → lỗi, giảm có lý do + quản lý → OK |
| Unit | Chuẩn hóa biển số và validate schema khách hàng/xe |
| Integration | Tạo/sửa/xóa mềm khách; trùng số điện thoại trong cùng gara bị chặn, khác gara thì không |
| Integration | Tạo xe kèm ownership; xe của gara khác đọc ra `NotFoundError` |
| Integration | Chuyển chủ sở hữu: ownership cũ đóng, mới mở, audit log ghi nhận |
| Integration | Ghi số km giảm bị chặn; override có lý do ghi audit `vehicle.mileage_overridden` |

## 10. Acceptance criteria

1. Lễ tân tạo được khách mới và xe mới, xe hiển thị đúng chủ sở hữu.
2. Kỹ thuật viên mở `/khach-hang` được nhưng không thấy nút thêm/sửa, và gọi
   action trực tiếp vẫn bị chặn ở server.
3. Tìm kiếm theo tên/điện thoại, biển số/VIN trả đúng kết quả và giữ trong URL.
4. Trang chi tiết xe hiện lịch sử km, lịch sử chủ sở hữu và timeline theo thứ tự
   thời gian giảm dần.
5. Nhập số km nhỏ hơn số hiện tại bị từ chối với thông báo tiếng Việt rõ ràng;
   quản lý override được và audit log có bản ghi.
6. Chuyển chủ sở hữu không làm mất lịch sử kỹ thuật của xe.
7. Toàn bộ vòng kiểm chứng xanh: typecheck, lint, unit, integration, build.

## 11. Rủi ro

| Rủi ro | Giảm thiểu |
| --- | --- |
| Query xe qua ownership dễ bỏ sót điều kiện `isCurrent`/`endedAt` và rò rỉ chéo gara | Tập trung ở `src/data/vehicles.ts`, không viết query xe ở nơi khác; có integration test |
| Chuyển chủ sở hữu nửa vời (đóng cũ nhưng chưa mở mới) | Toàn bộ trong `prisma.$transaction`, audit ghi cùng transaction |
| `currentKm` lệch với `MileageLog` | Chỉ cập nhật `currentKm` trong cùng transaction với việc ghi log |
| Xóa mềm khách còn lệnh sửa chữa mở gây dữ liệu treo | Kiểm tra lệnh đang mở trước khi xóa, trả lỗi nghiệp vụ |

## 12. Kiểm chứng hoàn tất

- `pnpm prisma migrate dev`: áp dụng migration
  `20260727220000_enforce_single_current_vehicle_ownership`.
- `pnpm prisma migrate status`: database đã đồng bộ, 3 migrations.
- `pnpm typecheck`: đạt.
- `pnpm lint`: đạt.
- `pnpm test`: đạt, 3 file / 62 tests.
- `pnpm test:integration`: đạt, 2 file / 12 tests.
- `pnpm build`: đạt, 20 routes.
- Code review + accessibility review: không còn lỗi CRITICAL/HIGH đã xác nhận.
- E2E Playwright: chưa chạy vì project chưa cài Playwright.

## 13. Báo cáo hoàn thành

- Customer và vehicle CRUD dùng action/service/repository tách lớp; mọi write lấy
  `garageId` từ session.
- Chuyển chủ và ghi km chạy trong transaction, khóa row xe; database có partial
  unique index để chặn nhiều ownership hiện tại.
- Chủ cũ thuộc garage khác được ẩn PII trong lịch sử ownership.
- Đã thêm integration coverage cho scope xe, ownership transfer, audit override km
  và phone trùng khác garage.
- Không có E2E vì Playwright chưa được cài; cần bổ sung trước release production.
