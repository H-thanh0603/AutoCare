# AutoCare — Architecture Decision Records (ADR)

Danh sách quyết định kiến trúc, ghi theo thứ tự phát sinh. Mỗi quyết định gồm: bối cảnh, quyết
định, lý do. Đây là nguồn sự thật cho các lựa chọn không hiển nhiên từ đặc tả nghiệp vụ.

## D1 — `prompt.md` là nguồn đặc tả duy nhất

**Bối cảnh**: `<source_of_truth>` trong `prompt.md` yêu cầu đọc toàn bộ tài liệu
`AutoCare_Garage_Vehicle_Health_Record_Project.md`. File này **không tồn tại** trong repository
(đã kiểm tra tại Milestone 0 — chỉ có `prompt.md`, `README.md`, và scaffold Next.js mặc định).

**Quyết định**: Toàn bộ tài liệu Milestone 0 (`docs/PRODUCT.md`, `docs/ARCHITECTURE.md`,
`docs/DATABASE.md`, `docs/RBAC.md`, `docs/WORKFLOWS.md`, `docs/SECURITY.md`, `docs/TESTING.md`,
`docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, `docs/progress/MILESTONE-00.md`) được xây dựng hoàn
toàn từ nội dung `prompt.md`. Khi có mâu thuẫn hoặc thiếu chi tiết, ưu tiên diễn giải hợp lý nhất
theo tinh thần các phần `<core_business_rules>`, `<state_machines>`, `<mvp_scope>` của `prompt.md`.

**Lý do**: `prompt.md` là tài liệu duy nhất người dùng xác nhận có sẵn; không thể chờ file không
tồn tại. Rủi ro liên quan (thiếu chi tiết UI/copy cụ thể, thiếu số liệu ngưỡng cụ thể) được ghi
trong `docs/progress/MILESTONE-00.md` mục Rủi ro và Giả định.

## D2 — Tiền lưu bằng `Int` VND

**Bối cảnh**: `prompt.md` quy tắc 20 yêu cầu "số nguyên đơn vị tiền nhỏ nhất hoặc kiểu decimal an
toàn; không dùng floating-point JavaScript trực tiếp".

**Quyết định**: Dùng `Int` (Prisma) cho mọi cột tiền, đơn vị là **đồng VND** — không nhân/chia
thêm hệ số vì VND không có đơn vị nhỏ hơn đồng (khác USD/cents). Tổng hợp nhiều dòng dùng `BigInt`
ở tầng tính toán để tránh tràn số, ép lại `Int` khi lưu.

**Lý do**: Đơn giản hơn `Decimal` cho một loại tiền tệ duy nhất (VND) trong MVP; tránh rủi ro
floating-point của `Float`/`Number` JS. Nếu tương lai hỗ trợ đa tiền tệ, cần ADR mới.

## D3 — Auth.js v5 credentials provider + bcryptjs, session JWT

**Bối cảnh**: `prompt.md` yêu cầu "Auth.js hoặc giải pháp authentication hiện có trong repository"
kèm session an toàn, RBAC, kiểm tra quyền ở backend. Repository hiện tại chưa có auth nào.

**Quyết định**: Dùng Auth.js (NextAuth) v5, provider `Credentials` (email + password tự quản lý,
không cần OAuth cho MVP một garage), hash password bằng `bcryptjs`, session strategy `jwt` chứa
`userId`, `role`, `garageId`/`customerId`.

**Lý do**: Auth.js là lựa chọn tiêu chuẩn cho Next.js App Router, tích hợp middleware/Server
Component tốt. Credentials provider phù hợp vì MVP không yêu cầu đăng nhập qua Google/Facebook.
`bcryptjs` không cần native binding, tránh vấn đề build trên môi trường Windows/CI khác nhau.

## D4 — Modular monolith, không microservices

**Bối cảnh**: `<architecture>` trong `prompt.md` chỉ định rõ modular monolith, cấm microservices
trong MVP; `<avoid>` cấm "dùng microservices".

**Quyết định**: Một Next.js app duy nhất, chia theo module trong `src/modules/*` với ranh giới rõ
(domain/schema/repository/service), không tách service network riêng.

**Lý do**: Dự án một người phát triển cùng AI; microservices tạo overhead vận hành (network,
deploy, observability) không tương xứng với quy mô một garage MVP. Ranh giới module rõ ràng vẫn
cho phép tách dịch vụ sau này nếu cần, không phải viết lại từ đầu.

## D5 — Multi-tenant sẵn sàng bằng `garageId` + scope theo session, MVP một garage

**Bối cảnh**: `<multi_tenant_readiness>` yêu cầu database/authorization sẵn sàng nhiều garage
nhưng MVP chỉ phục vụ một garage, không cần billing/quản trị SaaS.

**Quyết định**: Mọi bảng thuộc garage có `garageId`; mọi truy vấn scope theo `garageId` lấy từ
session (không tin client); seed dữ liệu MVP tạo đúng một `Garage`. Không xây UI chọn/tạo garage
nhiều-tenant, không xây subscription billing.

**Lý do**: Chuẩn bị đúng mức — đủ để mở rộng đa garage sau này mà không phải migrate lại toàn bộ
schema, nhưng không over-engineer UI/billing chưa cần trong MVP (đúng nguyên tắc ưu tiên số 1-2
trong `<role>`).

## D6 — PostgreSQL chạy qua Docker Compose cho development

**Bối cảnh**: Repository chưa có cấu hình database. Cần một cách nhất quán, tái lập được để chạy
PostgreSQL local cho một người phát triển.

**Quyết định**: Dùng Docker Compose (`docker-compose.yml`) chạy image `postgres:16` cho môi trường
dev; production dùng PostgreSQL managed hoặc self-host riêng (xem `docs/DEPLOYMENT.md`).

**Lý do**: Docker Compose là cách nhanh nhất để có PostgreSQL nhất quán trên máy phát triển, không
yêu cầu cài PostgreSQL native, dễ reset dữ liệu khi cần seed lại.

## D7 — File storage abstraction: local (dev) / S3-compatible-Supabase (production)

**Bối cảnh**: `<required_tech_stack>` yêu cầu thiết kế abstraction cho file storage, dev dùng
local/mock, production hỗ trợ Supabase Storage/Cloudinary/S3-compatible, không phụ thuộc chặt một
nhà cung cấp trong domain layer.

**Quyết định**: Module `media` định nghĩa interface `FileStorage` (`upload`, `getUrl`, `delete`);
implement `LocalFileStorage` (lưu vào `public/uploads` hoặc thư mục riêng ngoài `public` + serve
qua route handler) cho dev; production chọn adapter cụ thể khi triển khai Milestone 9, cấu hình
qua biến môi trường `FILE_STORAGE_DRIVER`.

**Lý do**: Giữ domain layer (module `media`, và mọi module dùng ảnh như `inspections`,
`repair-orders`) không biết chi tiết nhà cung cấp; đổi provider chỉ đổi adapter.

## D8 — State machine tập trung trong domain layer

**Bối cảnh**: `<state_machines>` yêu cầu "tạo các hàm transition tập trung và test các transition
hợp lệ cũng như không hợp lệ"; `<code_quality>` cấm "cập nhật trạng thái tùy ý"/"magic string cho
trạng thái".

**Quyết định**: Mỗi entity có state machine (`RepairOrder`, `Quotation`, `QuotationItem`,
`WorkTask`, `Invoice`, `Appointment`) có một hàm transition duy nhất trong
`src/modules/<module>/domain.ts` (ví dụ `transitionRepairOrder()`), nhận `(current, event/action,
actor)`, trả về trạng thái mới hoặc throw lỗi nghiệp vụ nếu transition không hợp lệ. Không nơi nào
khác được set trực tiếp field `status`.

**Lý do**: Tập trung logic transition giúp unit test đầy đủ toàn bộ bảng chuyển trạng thái
(`docs/WORKFLOWS.md`) ở một chỗ, tránh rải rác kiểm tra `if (status === ...)` khắp service/route,
giảm rủi ro trạng thái không hợp lệ lọt qua do quên kiểm tra ở một nơi.
