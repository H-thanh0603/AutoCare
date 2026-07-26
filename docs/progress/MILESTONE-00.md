# Milestone 0 — Repository audit và specification

## 1. Mục tiêu

- Đọc toàn bộ đặc tả dự án, xác nhận nguồn sự thật.
- Kiểm tra hiện trạng repository (cấu trúc, dependency, database, auth, test, git).
- Lập requirement matrix bao phủ toàn bộ `<mvp_scope>`.
- Chốt giả định cho các điểm chưa rõ trong đặc tả.
- Tạo bộ tài liệu kiến trúc (`docs/PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `RBAC.md`,
  `WORKFLOWS.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `DECISIONS.md`).
- **Không** xây UI lớn ở giai đoạn này (đúng yêu cầu milestone 0 trong `prompt.md`).

## 2. Phạm vi

- Audit repository hiện có.
- Requirement matrix đầy đủ.
- Toàn bộ file tài liệu Milestone 0 liệt kê ở `<documentation_requirements>`.
- Kế hoạch chi tiết cho Milestone 1-9.

## 3. Ngoài phạm vi (của milestone này)

- Viết code triển khai (schema Prisma thật, route, component, service).
- Cài dependency mới (Prisma, Auth.js, Tailwind config nghiệp vụ, shadcn/ui, Vitest, Playwright...).
- Chạy migration, seed, test.

Các việc này thuộc Milestone 1 trở đi, theo `<development_phases>`.

## 4. Hiện trạng repository (kết quả audit)

| Hạng mục | Kết quả kiểm tra |
|---|---|
| Cấu trúc thư mục | Scaffold `create-next-app` mặc định: `src/app/{layout.tsx,page.tsx,globals.css}`, `public/*.svg`. Chưa có `src/modules`, `src/lib`, `src/components`, `prisma/`, `tests/`. |
| Package manager | `pnpm` (có `pnpm-workspace.yaml`). |
| Framework | Next.js `16.2.11`, React `19.2.4`, App Router. `package.json` tên `tmp-app` (tên mặc định scaffold, chưa đổi thành `autocare`). |
| TypeScript | `tsconfig.json` đã có `strict: true`, path alias `@/*` → `src/*`. Đáp ứng yêu cầu strict mode sẵn. |
| UI | Tailwind CSS v4 đã cài (`@tailwindcss/postcss`), nhưng **chưa cài shadcn/ui, Lucide Icons**. |
| Database | **Chưa có** Prisma, chưa có schema, chưa có kết nối PostgreSQL. |
| Authentication | **Chưa có** Auth.js hoặc giải pháp auth nào. |
| Validation | **Chưa có** Zod, React Hook Form. |
| Test | **Chưa có** Vitest, Playwright, hoặc bất kỳ test nào. |
| Lint/format | ESLint `9` với `eslint-config-next` đã cấu hình (`eslint.config.mjs`). Chưa rõ Prettier. |
| Git | Nhánh `main`, 1 commit "Initial commit" chứa scaffold trên. `prompt.md` đang untracked. Không có file `.env`/`.env.example`. |
| File đặc tả gốc | `AutoCare_Garage_Vehicle_Health_Record_Project.md` được nhắc trong `prompt.md` **không tồn tại** trong repo → xem D1 trong `docs/DECISIONS.md`. |

**Kết luận**: Repository hiện đang ở trạng thái "trống" về mặt nghiệp vụ (chỉ có scaffold
Next.js mặc định). Theo `<initial_task>` bước 12 của `prompt.md`, sau khi hoàn chỉnh tài liệu
Milestone 0, công việc tiếp theo là triển khai Milestone 1 (Foundation) từ đầu — không có code
nghiệp vụ cũ nào cần bảo toàn hoặc migrate.

## 5. Giả định (đã chốt để tiếp tục triển khai)

| # | Điểm chưa rõ trong `prompt.md` | Giả định đã chốt |
|---|---|---|
| A1 | File đặc tả gốc không tồn tại | `prompt.md` là nguồn đặc tả duy nhất (D1) |
| A2 | Đơn vị tiền không nói rõ kiểu dữ liệu SQL cụ thể | `Int` VND, `BigInt` khi tổng hợp (D2) |
| A3 | Không chỉ định thư viện auth cụ thể | Auth.js v5 + credentials + bcryptjs (D3) |
| A4 | Không chỉ định giới hạn upload cụ thể (dung lượng, MIME) | Đề xuất ảnh ≤ 10MB, whitelist JPEG/PNG/WEBP (+ PDF cho tài liệu); chốt số chính xác khi triển khai module `media` ở Milestone 3 |
| A5 | Không chỉ định thời hạn mặc định của `ShareLink` | Không hết hạn theo thời gian mặc định (chủ xe tự đặt hoặc để vô hạn), nhưng luôn thu hồi được — đơn giản nhất cho MVP |
| A6 | Không chỉ định cổng thanh toán online cụ thể | MVP chỉ ghi nhận thanh toán thủ công (tiền mặt/chuyển khoản/POS), không tích hợp cổng thanh toán online nào — khớp với `<mvp_scope>` "Không thuộc MVP: Tích hợp mọi cổng thanh toán" |
| A7 | Không chỉ định ngưỡng rate limiting cụ thể | Đề xuất 5 lần thất bại/15 phút/IP+email cho đăng nhập; điều chỉnh khi có dữ liệu thực tế |
| A8 | Không chỉ định cỡ số tiền tối đa | `Int` 32-bit đủ dùng (~2.1 tỷ đồng); nếu vượt, cần ADR nâng cấp `BigInt` |
| A9 | Không chỉ định rõ ai được duyệt thay khách khi cần | GARAGE_MANAGER có thể ghi nhận duyệt thay khi có xác nhận ngoài hệ thống (điện thoại...), bắt buộc audit log rõ ràng ghi nhận đây là duyệt thay |
| A10 | Không chỉ định công cụ rate limiting/cache cụ thể | MVP không cần Redis riêng; dùng đếm trong PostgreSQL hoặc bộ nhớ tiến trình, nâng cấp sau nếu cần |
| A11 | Tên package hiện tại là `tmp-app` | Sẽ đổi thành `autocare` ở Milestone 1 khi cấu hình lại `package.json` |

## 6. Requirement matrix

Bao phủ toàn bộ `<mvp_scope>`, `<core_business_rules>`, `<state_machines>`, và
`<vehicle_health_record>` trong `prompt.md`. Trạng thái hiện tại: **Chưa triển khai** cho toàn bộ
(repository chưa có code nghiệp vụ, xem mục 4).

| # | Requirement | Nguồn (section) | Module | Ưu tiên | Trạng thái | Acceptance criteria |
|---|---|---|---|---|---|---|
| 1 | Đăng nhập bằng email/password | mvp_scope, required_tech_stack | auth | P0 | Chưa triển khai | Đăng nhập đúng thông tin vào được đúng khu vực theo role; sai thông tin bị từ chối với thông báo chung, không lộ email tồn tại |
| 2 | Quản lý hồ sơ cá nhân | mvp_scope | users | P0 | Chưa triển khai | User sửa được tên/thông tin liên hệ của chính mình; không sửa được user khác trừ vai trò quản lý |
| 3 | RBAC 6 vai trò, kiểm tra ở backend | roles_and_permissions | auth, rbac(lib) | P0 | Chưa triển khai | Mọi service method có kiểm tra quyền; test permission cho từng role × resource theo `docs/RBAC.md` |
| 4 | Garage scope mọi truy vấn dữ liệu garage | multi_tenant_readiness | garages | P0 | Chưa triển khai | Mọi repository nhận `garageId` bắt buộc; integration test tenant isolation pass |
| 5 | Quản lý nhân sự garage (garage member) | architecture | garage-members | P1 | Chưa triển khai | GARAGE_MANAGER thêm/sửa/xóa nhân sự và role trong garage của mình |
| 6 | CRUD khách hàng (garage) | mvp_scope (dashboard) | customers | P0 | Chưa triển khai | RECEPTIONIST/GARAGE_MANAGER tạo/sửa/xóa khách hàng, validate SĐT/thông tin bắt buộc |
| 7 | Thêm và quản lý xe (chủ xe) | mvp_scope (portal) | vehicles | P0 | Chưa triển khai | CUSTOMER thêm xe của mình, sửa thông tin xe mình sở hữu, không sửa xe người khác |
| 8 | CRUD xe (garage) | mvp_scope (dashboard) | vehicles | P0 | Chưa triển khai | RECEPTIONIST/GARAGE_MANAGER quản lý toàn bộ xe trong garage |
| 9 | Lịch sử chủ sở hữu xe | vehicle_health_record | vehicle-ownership | P0 | Chưa triển khai | Xem được danh sách chủ sở hữu theo thời gian, không mất dữ liệu khi chuyển chủ |
| 10 | Chuyển quyền sở hữu xe (transaction) | data_integrity, core_business_rules #16,19 | vehicle-ownership | P0 | Chưa triển khai | Chuyển chủ trong 1 transaction: đóng ownership cũ, tạo mới, giữ lịch sử kỹ thuật, tạo TimelineEvent + AuditLog |
| 11 | Lịch sử kilomet + validation không giảm | vehicle_health_record, core_business_rules #14 | vehicles | P0 | Chưa triển khai | Ghi kilomet giảm bị chặn trừ khi có `reason` + role GARAGE_MANAGER; có audit log khi override |
| 12 | Tìm kiếm nhanh theo SĐT/biển số/mã phiếu | ux_requirements | customers, vehicles, repair-orders | P1 | Chưa triển khai | Ô tìm kiếm dashboard trả kết quả đúng theo 1 trong 3 tiêu chí trong < 1s với dữ liệu demo |
| 13 | Biển số không là định danh vĩnh viễn, hỗ trợ VIN | core_business_rules #15 | vehicles | P1 | Chưa triển khai | `plateNumber` sửa được có lịch sử; `vin` unique khi có giá trị, nullable |
| 14 | Đặt lịch (customer) | mvp_scope (portal) | appointments | P0 | Chưa triển khai | CUSTOMER tạo Appointment trạng thái PENDING gắn đúng xe của mình |
| 15 | Đổi/hủy lịch theo quy tắc | mvp_scope (portal) | appointments | P0 | Chưa triển khai | Đổi/hủy chỉ cho phép trước ngưỡng thời gian cấu hình; sau ngưỡng bị chặn với thông báo rõ |
| 16 | Garage calendar + xác nhận lịch | mvp_scope (dashboard) | appointments | P0 | Chưa triển khai | RECEPTIONIST xem calendar theo ngày/tuần, xác nhận chuyển PENDING → CONFIRMED |
| 17 | Appointment state machine đầy đủ | state_machines | appointments | P0 | Chưa triển khai | Toàn bộ transition ở `docs/WORKFLOWS.md` mục 2 có unit test hợp lệ + không hợp lệ |
| 18 | Tạo phiếu tiếp nhận (RepairOrder) | mvp_scope (dashboard) | repair-orders | P0 | Chưa triển khai | Từ Appointment CONFIRMED hoặc walk-in, tạo RepairOrder RECEIVED gắn đúng garage/vehicle/customer |
| 19 | Checklist tình trạng xe ban đầu | mvp_scope (dashboard) | repair-orders, inspections | P0 | Chưa triển khai | Form checklist lưu được, hiển thị lại đúng dữ liệu đã nhập |
| 20 | Ghi kilomet & nhiên liệu khi tiếp nhận | mvp_scope (dashboard) | repair-orders | P0 | Chưa triển khai | Ghi kilomet tạo `MileageRecord`; kilomet hiển thị đúng trên hồ sơ xe |
| 21 | Upload ảnh tiếp nhận (trước/sau) | mvp_scope, security_requirements | media | P0 | Chưa triển khai | Upload thành công với MIME/size hợp lệ; từ chối file không hợp lệ với thông báo rõ |
| 22 | RepairOrder state machine, không hard delete | state_machines, core_business_rules #11 | repair-orders | P0 | Chưa triển khai | Toàn bộ transition ở `docs/WORKFLOWS.md` mục 3 có test; không có hàm hard delete trong repository |
| 23 | Khách xem phiếu tiếp nhận | mvp_scope (portal) | repair-orders | P1 | Chưa triển khai | CUSTOMER xem được phiếu của xe mình, không xem được phiếu xe người khác |
| 24 | Kiểm tra/chẩn đoán, inspection items, severity | mvp_scope (dashboard) | inspections | P0 | Chưa triển khai | TECHNICIAN tạo Inspection với nhiều InspectionItem có mức độ nghiêm trọng |
| 25 | Khách xem kết quả kiểm tra | mvp_scope (portal) | inspections | P0 | Chưa triển khai | CUSTOMER xem đúng kết quả kiểm tra xe mình, có ảnh minh chứng nếu có |
| 26 | Tạo báo giá từ inspection | mvp_scope (dashboard) | quotations | P0 | Chưa triển khai | Quotation DRAFT tạo với item tham chiếu inspection item liên quan |
| 27 | Quản lý phiên bản báo giá (versioning) | core_business_rules #2,3 | quotations | P0 | Chưa triển khai | Sửa báo giá đã SENT tạo bản mới, bản cũ chuyển SUPERSEDED trong transaction; không UPDATE trực tiếp bản đã gửi |
| 28 | Gửi báo giá cho khách | mvp_scope (dashboard) | quotations | P0 | Chưa triển khai | Chuyển DRAFT → SENT, khách nhận được thông báo, không sửa được nội dung sau khi gửi |
| 29 | Duyệt/từ chối từng hạng mục báo giá | mvp_scope (portal), core_business_rules #4 | quotations | P0 | Chưa triển khai | CUSTOMER duyệt/từ chối độc lập mỗi QuotationItem; trạng thái Quotation tổng cập nhật đúng |
| 30 | Theo dõi phê duyệt (dashboard) | mvp_scope (dashboard) | quotations | P0 | Chưa triển khai | RECEPTIONIST/GARAGE_MANAGER xem trạng thái duyệt real-time theo item |
| 31 | QuotationItem state machine | state_machines | quotations | P0 | Chưa triển khai | Toàn bộ transition mục 5 `docs/WORKFLOWS.md` có test hợp lệ + không hợp lệ |
| 32 | Báo giá bổ sung khi phát sinh | core_business_rules #6 | quotations | P0 | Chưa triển khai | Tạo Quotation mới gắn `parentQuotationId`, chỉ chứa hạng mục phát sinh, đi qua đúng luồng duyệt |
| 33 | Thông báo khi có báo giá cần duyệt | mvp_scope, notifications | notifications | P1 | Chưa triển khai | CUSTOMER nhận Notification trong app khi Quotation chuyển SENT |
| 34 | Tạo work task chỉ từ item APPROVED | core_business_rules #1,5 | work-tasks | P0 | Chưa triển khai | Gọi tạo WorkTask từ item PENDING/REJECTED phải throw lỗi; chỉ item APPROVED tạo được |
| 35 | Phân công kỹ thuật viên | mvp_scope (dashboard) | work-tasks | P0 | Chưa triển khai | RECEPTIONIST/GARAGE_MANAGER gán `assignedTechnicianId`; TECHNICIAN chỉ thấy task được giao |
| 36 | Kanban tiến độ | mvp_scope, ux_requirements | work-tasks | P0 | Chưa triển khai | Kéo-thả cập nhật đúng trạng thái qua transition hợp lệ; chặn kéo sang trạng thái không hợp lệ |
| 37 | WorkTask state machine + work log | state_machines | work-tasks | P0 | Chưa triển khai | Toàn bộ transition mục 6 `docs/WORKFLOWS.md` có test; mỗi thay đổi trạng thái ghi WorkLog |
| 38 | Khách xem tiến độ sửa chữa | mvp_scope (portal) | work-tasks, repair-orders | P0 | Chưa triển khai | CUSTOMER xem tiến độ tổng hợp từ WorkTask của RepairOrder xe mình |
| 39 | Quản lý dịch vụ (catalog) | mvp_scope (dashboard) | services | P1 | Chưa triển khai | CRUD Service với giá niêm yết (VND, Int) |
| 40 | Quản lý phụ tùng (catalog) | mvp_scope (dashboard) | parts | P0 | Chưa triển khai | CRUD Part với đơn vị tính, giá, liên kết InventoryItem |
| 41 | Nhập/xuất/điều chỉnh kho | mvp_scope (dashboard) | inventory | P0 | Chưa triển khai | Ba loại InventoryTransaction (IN/ISSUE/ADJUST) cập nhật đúng `InventoryItem.quantity` |
| 42 | Xuất kho transaction-safe, không tồn kho âm | core_business_rules #7,8,9 | inventory | P0 | Chưa triển khai | Xuất kho chạy trong `$transaction`; xuất vượt tồn kho bị chặn trừ khi garage bật cấu hình đặc biệt |
| 43 | Cảnh báo tồn kho thấp | mvp_scope (dashboard) | inventory | P1 | Chưa triển khai | Danh sách phụ tùng dưới ngưỡng tối thiểu hiển thị nổi bật trên dashboard |
| 44 | Nghiệm thu trước bàn giao | core_business_rules #10 | repair-orders, work-tasks | P0 | Chưa triển khai | Transition READY_FOR_DELIVERY → COMPLETED bị chặn nếu chưa qua QUALITY_CHECK đạt |
| 45 | Tạo hóa đơn từ repair order (transaction) | mvp_scope, data_integrity | invoices | P0 | Chưa triển khai | Invoice DRAFT tạo đúng tổng tiền từ Quotation đã APPROVED + phụ tùng đã xuất, trong transaction |
| 46 | Ghi nhận đặt cọc/thanh toán (transaction) | mvp_scope, data_integrity | payments | P0 | Chưa triển khai | Payment cập nhật đúng `Invoice.balance`/`status` trong transaction; không sai số dư |
| 47 | Invoice state machine | state_machines | invoices | P0 | Chưa triển khai | Toàn bộ transition mục 7 `docs/WORKFLOWS.md` có test |
| 48 | Bàn giao xe chỉ sau nghiệm thu | core_business_rules #10 | repair-orders | P0 | Chưa triển khai | Không thể set RepairOrder COMPLETED khi chưa qua READY_FOR_DELIVERY |
| 49 | Khách xem hóa đơn | mvp_scope (portal) | invoices | P0 | Chưa triển khai | CUSTOMER xem đúng hóa đơn của mình, không xem hóa đơn người khác |
| 50 | PDF/in hóa đơn | development_phases (milestone 6) | invoices | P1 | Chưa triển khai | Xuất được bản in/PDF hóa đơn với thông tin đầy đủ, đúng số tiền |
| 51 | Optimistic concurrency (`version`) | data_integrity | quotations, repair-orders, inventory, invoices | P0 | Chưa triển khai | Update với `version` cũ bị từ chối (ConflictError), không ghi đè âm thầm |
| 52 | Cập nhật hồ sơ sức khỏe khi hoàn tất | core_business_rules, vehicle_health_record | vehicle-health, maintenance-records | P0 | Chưa triển khai | RepairOrder COMPLETED tự tạo MaintenanceRecord + TimelineEvent(VERIFIED_GARAGE_RECORD) trong transaction |
| 53 | Timeline đầy đủ loại event + nguồn dữ liệu | vehicle_health_record | vehicle-health | P0 | Chưa triển khai | Timeline hiển thị đủ 13 loại event, mỗi bản ghi có badge nguồn (3 loại) rõ ràng |
| 54 | Bảo hành | mvp_scope | warranties | P1 | Chưa triển khai | Tạo/xem Warranty gắn xe/phụ tùng/dịch vụ với thời hạn |
| 55 | Lịch bảo dưỡng tiếp theo | mvp_scope, quy trình cuối luồng | vehicle-health | P1 | Chưa triển khai | Tính đúng ngày/kilomet bảo dưỡng tiếp theo sau khi hoàn tất RepairOrder |
| 56 | Link chia sẻ hồ sơ xe | mvp_scope, core_business_rules #17,18 | vehicle-health | P1 | Chưa triển khai | Tạo/thu hồi ShareLink; truy cập link đã thu hồi/hết hạn bị chặn; DTO không chứa dữ liệu cá nhân chủ xe |
| 57 | Khách xem lịch sử bảo dưỡng/bảo hành | mvp_scope (portal) | vehicle-health, warranties | P0 | Chưa triển khai | CUSTOMER xem đúng lịch sử và bảo hành của xe mình |
| 58 | Thông báo trong app cho khách | mvp_scope (portal) | notifications | P1 | Chưa triển khai | CUSTOMER nhận và đánh dấu đã đọc thông báo liên quan xe mình |
| 59 | Dashboard tổng quan garage | mvp_scope (dashboard) | reports | P1 | Chưa triển khai | Hiển thị số liệu vận hành cơ bản (số xe đang sửa, lịch hôm nay, tồn kho thấp...) |
| 60 | Báo cáo cơ bản (doanh thu, dịch vụ, kỹ thuật viên, kho) | mvp_scope, development_phases (milestone 8) | reports | P1 | Chưa triển khai | 4 loại báo cáo trả số liệu đúng khớp dữ liệu nguồn, GARAGE_MANAGER/CASHIER xem theo quyền |
| 61 | Audit log cho hành động nhạy cảm | security_requirements | audit-logs | P0 | Chưa triển khai | Đủ 8 nhóm hành động trong `docs/SECURITY.md` mục 8 đều sinh AuditLog với before/after |
| 62 | Backend authorization mọi mutation/query nhạy cảm | roles_and_permissions | auth, rbac(lib) | P0 | Chưa triển khai | Không có mutation nào chỉ kiểm tra quyền ở UI; test bao phủ ma trận `docs/RBAC.md` |
| 63 | Tenant isolation | multi_tenant_readiness | tất cả module có `garageId` | P0 | Chưa triển khai | Ít nhất 1 integration test: user garage A truy cập id garage B → NotFound/Forbidden |
| 64 | Rate limiting đăng nhập/endpoint nhạy cảm | security_requirements | auth | P1 | Chưa triển khai | Vượt ngưỡng thử đăng nhập bị khóa tạm thời, có test mô phỏng |
| 65 | Upload kiểm tra MIME/size, chặn file thực thi | security_requirements | media | P0 | Chưa triển khai | Upload file `.exe`/sai MIME bị từ chối; vượt size bị từ chối, thông báo rõ |
| 66 | Tính tiền không dùng float JS trực tiếp | core_business_rules #20 | lib/money | P0 | Chưa triển khai | Toàn bộ phép tính tiền đi qua `src/lib/money.ts`, có unit test số học chính xác |

## 7. Rủi ro

| Rủi ro | Mức độ | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|
| Thiếu file đặc tả gốc, có thể có chi tiết nghiệp vụ không nằm trong `prompt.md` | Trung bình | Có thể thiếu quy tắc nhỏ chưa được biết trước | D1: chỉ dùng `prompt.md`; khi phát hiện thiếu chi tiết khi code, ghi giả định mới theo nguyên tắc "chọn phương án an toàn và phổ biến" của `<working_mode>` |
| Repository chưa có nền tảng (auth, DB, test) — Milestone 1 khối lượng lớn | Cao | Có thể trễ tiến độ nếu không chia lát cắt dọc nhỏ | Chia Milestone 1 thành các phần nhỏ: config → DB/Prisma → auth → RBAC → seed → test foundation, verify từng phần |
| Business rule phức tạp (state machine, optimistic concurrency, transaction) dễ có lỗi biên | Cao | Sai lệch số liệu tiền/kho, mất tin tưởng người dùng thật | Bắt buộc unit test transition + integration test transaction trước khi đóng milestone (theo `docs/TESTING.md`) |
| Một người phát triển + AI, dễ over-engineer nếu không kiểm soát | Trung bình | Tốn thời gian vào abstraction không cần thiết | Tuân thủ `<avoid>`; mỗi module chỉ tạo file khi có nội dung thật, không scaffold rỗng |
| Ngưỡng cụ thể (upload size, rate limit, thời hạn share link) chưa được người dùng xác nhận | Thấp | Có thể cần chỉnh lại sau khi có phản hồi thực tế | Đã chốt giá trị mặc định hợp lý ở mục Giả định, dễ đổi vì là hằng số cấu hình, không phải kiến trúc |
| Money `Int` 32-bit có giới hạn ~2.1 tỷ đồng | Thấp (MVP một garage) | Garage rất lớn/hóa đơn rất lớn có thể vượt ngưỡng | Ghi nhận trong D2; nâng cấp `BigInt` bằng ADR mới nếu cần, không đổi ngầm |

## 8. Kế hoạch Milestone 1-9 (tóm tắt)

| Milestone | Nội dung chính | Đầu ra chốt |
|---|---|---|
| 1 — Foundation | Cấu hình project (đổi tên package, Tailwind/shadcn/ui, ESLint/Prettier), Prisma + PostgreSQL (Docker Compose), Auth.js + RBAC cơ bản, garage scope, `users`, `garage-members`, `audit-logs`, `src/lib/errors.ts`, seed data khởi tạo, test foundation (Vitest/Playwright config) | Đăng nhập được, có 1 garage seed, RBAC chặn đúng theo role, `pnpm build`/`lint`/`type-check` pass |
| 2 — Customers and vehicles | CRUD khách hàng, CRUD xe, `vehicle-ownership`, `MileageRecord`, tìm kiếm, trang chi tiết xe, timeline cơ bản | Garage tạo/tìm khách hàng và xe; xem được hồ sơ xe với lịch sử chủ sở hữu/kilomet ban đầu |
| 3 — Appointments and reception | Luồng đặt lịch customer, calendar garage, xác nhận, tạo `RepairOrder`, checklist tiếp nhận, media ban đầu, ghi kilomet/nhiên liệu | Khách đặt được lịch, garage xác nhận và tiếp nhận tạo phiếu, có ảnh và checklist ban đầu |
| 4 — Inspection and quotation | `Inspection`/`InspectionItem` (severity, media), `Quotation`/`QuotationItem` (versioning), duyệt từng hạng mục, notification, test quy tắc duyệt | Toàn bộ luồng kiểm tra → báo giá → khách duyệt/từ chối từng item hoạt động đúng, có test |
| 5 — Work management and inventory | `WorkTask`, phân công, Kanban, `WorkLog`, `Part`/`InventoryItem`/`InventoryTransaction`, cảnh báo tồn kho thấp, xuất kho transaction-safe, báo giá bổ sung | Chỉ item duyệt tạo task; xuất kho không âm, có transaction; phát sinh tạo được báo giá bổ sung |
| 6 — Quality check, invoice and delivery | Checklist nghiệm thu, `Invoice`, đặt cọc, `Payment`, công nợ, bàn giao, PDF hóa đơn, test transaction/audit | Nghiệm thu → hóa đơn → thanh toán → bàn giao hoạt động đúng, số dư hóa đơn luôn nhất quán |
| 7 — Vehicle health record | `MaintenanceRecord`, timeline đầy đủ, `Warranty`, lịch bảo dưỡng tiếp theo, health category, `ShareLink`, kiểm soát riêng tư | Hồ sơ sức khỏe xe cập nhật tự động sau khi hoàn tất sửa chữa; chia sẻ hồ sơ an toàn, không lộ dữ liệu cá nhân |
| 8 — Dashboard and reports | Dashboard vận hành, báo cáo doanh thu/dịch vụ/kỹ thuật viên/kho, tối ưu truy vấn | Số liệu báo cáo khớp dữ liệu nguồn; truy vấn không gây chậm với dữ liệu demo quy mô vừa |
| 9 — Production readiness | Rà soát accessibility, responsive QA, security review, E2E đầy đủ 16 bước, seed demo cuối, tài liệu backup, cấu hình deploy, README, hướng dẫn sử dụng | MVP chạy trọn vẹn quy trình Đặt lịch → ... → Hồ sơ sức khỏe xe cho một garage thật, đạt `<definition_of_done>` |
