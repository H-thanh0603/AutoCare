# Milestone 1 — Foundation

## 1. Mục tiêu

- Cấu hình project thật: đổi tên package, Tailwind v4 + shadcn/ui + Lucide, ESLint, Vitest.
- Prisma + PostgreSQL (Docker Compose), schema đầy đủ cho toàn bộ MVP, migration chạy được.
- Auth.js v5 credentials + bcrypt, session JWT, tách config edge-safe cho middleware.
- RBAC backend: bản đồ permission theo vai trò, garage scope lấy từ session.
- Lớp nền dùng chung: `errors`, `money`, `state-machine`, `transitions`, `audit`, `rate-limit`.
- Seed dữ liệu demo tiếng Việt.
- Khung UI: landing page, đăng nhập/đăng ký, portal khách hàng, shell dashboard garage.
- Test nền: unit cho money/state machine, integration cho tenant isolation.

## 2. Đã triển khai

### 2.1 Cấu hình

| Hạng mục | Kết quả |
|---|---|
| Package | `autocare`, pnpm, script `dev/build/lint/typecheck/test/test:integration/db:*` |
| TypeScript | `strict: true`, `moduleResolution: "bundler"`, alias `@/*` → `src/*`, không có `any`/`@ts-ignore` |
| UI | Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn/ui trên `@base-ui/react`, Lucide Icons |
| Form | React Hook Form + Zod v4 (`@hookform/resolvers`) |
| Lint | ESLint 9 + `eslint-config-next`, thêm rule `no-unused-vars` cho phép tiền tố `_` |
| Test | Vitest 4, hai project `unit` và `integration`, `resolve.tsconfigPaths` |

### 2.2 Database

- PostgreSQL 16 qua `docker-compose.yml` (container `autocare-db`, port 5432).
- Prisma 7 với generator `prisma-client` (output `src/generated/prisma`, đã gitignore) và
  adapter `@prisma/adapter-pg`.
- Migration đã áp dụng: `20260727010553_init`, `20260727023408_add_repair_order_advisor_relation`.
- Tiền tệ: `Int` VND (minor unit là chính đồng, VND không có phần lẻ) — không dùng float.
- Optimistic concurrency: cột `version` trên `Quotation`, `RepairOrder`, `WorkTask`, `Part`, `Invoice`.
- Multi-tenant: mọi bảng thuộc garage đều có `garageId` + index tổ hợp.

### 2.3 Auth

- Auth.js v5 credentials provider, mật khẩu bcrypt cost 12, session JWT 8 giờ.
- **Tách hai file**: `src/lib/auth.config.ts` không chứa Prisma/bcrypt nên middleware chạy được
  ở edge runtime; `src/lib/auth.ts` thêm provider và các truy vấn DB.
- Thông báo đăng nhập sai giống nhau cho email không tồn tại và mật khẩu sai; so sánh với
  hash giả khi không tìm thấy user để thời gian phản hồi tương đương (chống dò email).
- Rate limit đăng nhập và đăng ký theo IP/email.
- Đích chuyển hướng sau đăng nhập lấy từ session vừa cấp, không lấy từ form.

### 2.4 RBAC

- Hai tầng vai trò: `User.role` ∈ {CUSTOMER, STAFF, PLATFORM_ADMIN}, vai trò trong garage nằm ở
  `GarageMember.role` ∈ {RECEPTIONIST, TECHNICIAN, CASHIER, GARAGE_MANAGER}.
- `src/lib/rbac.ts`: 38 permission, bản đồ permission theo vai trò, `can`, `requirePermission`,
  `requireGarageScope`, `requireGarageRole`.
- `requireGarageScope` luôn lấy `garageId` từ session. Không có đường nào nhận `garageId` từ client.
- Menu dashboard sinh từ cùng bản đồ permission mà server dùng để chặn, nên UI không bao giờ
  hiện mục mà backend sẽ từ chối. Việc ẩn menu chỉ là tiện lợi; chặn thật nằm ở guard và data layer.

### 2.5 Lớp nền dùng chung

| File | Nội dung |
|---|---|
| `src/lib/errors.ts` | `AppError` và các lớp con: Unauthenticated, Forbidden, NotFound, Validation, Conflict, BusinessRule |
| `src/lib/money.ts` | Cộng/trừ/nhân/chia số nguyên VND, làm tròn half-away-from-zero, `formatVnd` |
| `src/lib/state-machine.ts` | Hàm chuyển trạng thái tập trung, chặn transition không hợp lệ |
| `src/lib/transitions.ts` | Bảng transition cho RepairOrder, Quotation, QuotationItem, WorkTask, Invoice, Appointment |
| `src/lib/audit.ts` | `recordAudit`, danh sách hành động, `redactSnapshot` che các khóa nhạy cảm |
| `src/lib/rate-limit.ts` | Bộ đếm trong tiến trình cho đăng nhập/đăng ký |
| `src/lib/action-result.ts` | `ActionResult<T>` + `runAction` để action không rò stack trace ra client |

### 2.6 Giao diện

| Route | Nội dung |
|---|---|
| `/` | Landing page giới thiệu quản lý xưởng + hồ sơ sức khỏe xe |
| `/dang-nhap`, `/dang-ky` | Form RHF + Zod, validate cả client và server, server là bên quyết định |
| `/tai-khoan` | Portal khách hàng: xe đang sở hữu, lịch hẹn, lệnh sửa chữa |
| `/khong-co-quyen` | Trang từ chối truy cập, không tiết lộ tài nguyên có tồn tại hay không |
| `/bang-dieu-khien` | Tổng quan xưởng: 6 chỉ số vận hành + danh sách lệnh đang mở, đọc từ DB thật |
| `/lenh-sua-chua`, `/khach-hang`, `/xe` | Danh sách thật từ data layer, đã scope theo garage |
| `/lich-hen`, `/bao-gia`, `/cong-viec`, `/kho`, `/hoa-don`, `/cai-dat` | Route đã có guard và permission; phần nghiệp vụ ghi rõ thuộc mốc nào, không hiển thị dữ liệu giả |

Ghi chú kiến trúc: đọc dữ liệu chạy trong React Server Component, ghi dữ liệu qua Server Action.
Không có truy vấn Prisma nào nằm trong component. Không có logic nghiệp vụ nào nằm trong action —
action chỉ validate, rate limit, rồi gọi service.

### 2.7 Phạm vi truy cập của portal

`src/data/portal.ts` scope theo `userId` từ session. Một tài khoản có thể ứng với nhiều bản ghi
`Customer` (mỗi garage một bản ghi), nên portal resolve toàn bộ `customerId` từ liên kết tài khoản
rồi mới dùng làm điều kiện truy vấn. Xe đã chuyển chủ bị loại khỏi portal của chủ cũ: lịch sử kỹ
thuật vẫn thuộc về xe, nhưng chủ cũ không còn đọc được qua portal.

`src/data/vehicles.ts` scope xe theo garage bằng đường quan hệ ownership → customer → garage, vì
bảng `vehicles` không có `garageId` (một xe có thể đi nhiều xưởng).

## 3. Ngoài phạm vi mốc này

- Nghiệp vụ đặt lịch, tiếp nhận, kiểm tra, báo giá, công việc, kho, hóa đơn (mốc 3–6).
- Hồ sơ sức khỏe xe và link chia sẻ (mốc 7).
- Báo cáo (mốc 8).
- Playwright E2E — chưa cài, nên mốc này **không có** kiểm thử E2E.

## 4. Kết quả kiểm chứng

Đã chạy thật, không suy đoán:

| Bước | Lệnh | Kết quả |
|---|---|---|
| Lint | `pnpm lint` | Pass, 0 error 0 warning |
| Typecheck | `pnpm typecheck` | Pass |
| Unit test | `pnpm test` | 56/56 pass (2 file) |
| Integration test | `pnpm test:integration` | 5/5 pass, gồm test tenant isolation |
| Build | `pnpm build` | Pass, 17 route |
| Migration | `prisma migrate dev` | Hai migration áp dụng thành công |
| Seed | `pnpm db:seed` | Chạy được, dữ liệu tiếng Việt |

Chưa kiểm chứng:

- **E2E**: Playwright chưa được cài nên chưa có kiểm thử luồng người dùng đầu-cuối.
- Truy vấn `$queryRaw` đếm phụ tùng sắp hết trong `src/data/dashboard.ts` đã chạy qua build và
  qua trang tổng quan với dữ liệu seed, nhưng chưa có unit test riêng cho nó.

## 5. Lỗi đã gặp và cách sửa

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Middleware kéo Prisma và bcrypt vào edge bundle | Config Auth.js nằm chung một file với provider | Tách `auth.config.ts` (edge-safe) khỏi `auth.ts` (Node) |
| `PrismaTx` không khớp tham số callback của `$transaction` | Type viết tay bằng `Omit` bỏ đúng những key mà client sinh ra lại có | Suy ra type từ chính `Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]` |
| `$queryRaw` đếm tồn kho thấp dùng tên cột không tồn tại | Đoán tên cột (`stockQuantity`, `reorderPoint`, `deletedAt`) | Đọc lại model `Part`: đúng là `quantityInStock`, `lowStockThreshold`, `isActive` |
| Đăng ký trùng email đồng thời trả lỗi nội bộ mờ | Không xử lý unique violation | Map Prisma `P2002` thành `BusinessRuleError` với thông báo rõ |
| Thiếu quan hệ `RepairOrder.advisor` | Schema thiếu relation | Migration `20260727023408` + `prisma generate` (đổi schema luôn cần cả hai bước) |

## 6. Nợ kỹ thuật ghi nhận

- `docs/RBAC.md` cho lễ tân quyền nhập kho/điều chỉnh kho, còn `src/lib/rbac.ts` chỉ cho
  `inventory:read`. Cần chốt lại một bên khi làm mốc 5 (kho).
- Chưa cài Playwright, nên `<definition_of_done>` phần E2E còn treo.
- Rate limit đếm trong bộ nhớ tiến trình, đúng như giả định A10, nhưng sẽ không còn đúng khi
  chạy nhiều instance. Cần đổi sang bộ đếm dùng chung trước khi scale ngang.
- Next.js 16 báo `middleware` sắp bị bỏ, khuyến nghị đổi sang `proxy`. Chưa đổi để tránh trộn
  thay đổi hạ tầng vào mốc này.

## 7. Bước tiếp theo

Mốc 2 — Customers and vehicles: CRUD khách hàng, CRUD xe, lịch sử chủ sở hữu, `MileageLog` với
quy tắc không cho kilomet giảm, tìm kiếm theo SĐT/biển số, trang chi tiết xe và timeline cơ bản.
