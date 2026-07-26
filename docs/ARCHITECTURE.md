# AutoCare — Kiến trúc hệ thống

## 1. Kiểu kiến trúc

**Modular monolith** trên nền **Next.js App Router**. Không dùng microservices trong MVP (quyết
định chốt, xem `docs/DECISIONS.md` D4). Toàn bộ ứng dụng chạy trong một process Next.js, nhưng mã
nguồn được chia theo module nghiệp vụ với ranh giới rõ ràng để có thể tách dịch vụ sau này nếu cần.

## 2. Stack đã chốt

- **Next.js** bản stable mới nhất khởi tạo qua `create-next-app` (repository hiện tại đã có
  Next.js 16.2.11 + React 19.2.4 làm nền, xem `docs/progress/MILESTONE-00.md` mục kiểm tra
  repository).
- **App Router**, **TypeScript strict mode** (đã cấu hình `strict: true` trong `tsconfig.json`),
  thư mục `src/`.
- Tailwind CSS + shadcn/ui + Lucide Icons cho UI.
- React Hook Form + Zod cho form và validation (client và server).
- PostgreSQL + Prisma ORM.
- Auth.js (NextAuth) v5, credentials provider (xem D3).
- Vitest (unit/integration), Playwright (E2E).

## 3. Cấu trúc thư mục

```
src/
  app/                          # App Router — chỉ routing, layout, và gọi vào service/module
    (auth)/
      login/                    # Trang đăng nhập chung cho mọi vai trò
    portal/                     # Customer Portal — yêu cầu role CUSTOMER
      vehicles/
      appointments/
      quotations/
      invoices/
      share/
      ...
    dashboard/                  # Garage Dashboard — yêu cầu role nhân sự garage
      appointments/
      repair-orders/
      inspections/
      quotations/
      work-tasks/
      inventory/
      invoices/
      reports/
      audit-logs/
      ...
    api/                        # Route Handlers khi Server Action không phù hợp (webhook, upload,…)

  modules/                      # Toàn bộ nghiệp vụ, theo domain — KHÔNG phụ thuộc vào src/app
    auth/
    users/
    garages/
    garage-members/
    customers/
    vehicles/
    vehicle-ownership/
    appointments/
    repair-orders/
    inspections/
    quotations/
    work-tasks/
    services/
    parts/
    inventory/
    invoices/
    payments/
    maintenance-records/
    vehicle-health/
    warranties/
    notifications/
    media/
    audit-logs/
    reports/

  lib/                          # Hạ tầng dùng chung, không chứa nghiệp vụ cụ thể
    prisma.ts                   # Prisma client singleton
    auth.ts                     # Auth.js config, session helpers
    rbac.ts                     # Permission checks dùng chung (can(), requireRole()...)
    errors.ts                   # AppError, NotFoundError, ForbiddenError, ConflictError...
    money.ts                    # Số học tiền VND an toàn (Int, không float)
    audit.ts                    # Ghi audit log dùng chung

  components/
    ui/                         # shadcn/ui components (generated, chỉnh sửa tối thiểu)

prisma/
  schema.prisma
  migrations/
  seed.ts

tests/
  unit/
  integration/
  e2e/
```

### Cấu trúc một module (`src/modules/<module>/`)

Mỗi module là một lát cắt dọc theo domain, gồm các file sau (không phải module nào cũng cần đủ
tất cả — tạo file khi có nội dung thật, không tạo file rỗng để "đủ khuôn"):

| File | Trách nhiệm |
|---|---|
| `domain.ts` | Types, enums, state machine, các hàm nghiệp vụ thuần (pure function) không phụ thuộc I/O |
| `schema.ts` | Zod schema cho input validation — dùng lại được ở cả client (React Hook Form) và server |
| `repository.ts` | Data-access layer — **nơi duy nhất** gọi Prisma cho module này |
| `service.ts` | Application layer — điều phối repository, domain logic, transaction, audit log |
| `authorization.ts` | Quy tắc phân quyền riêng của module (khi phức tạp hơn rbac.ts chung) |

Quy tắc bắt buộc:

- **Không** import `@/lib/prisma` hoặc gọi Prisma Client trực tiếp trong component (`src/app/**`
  hoặc bất kỳ file `.tsx`). Component chỉ gọi service qua Server Component (đọc) hoặc Server
  Action/Route Handler (viết).
- **Không** đặt toàn bộ nghiệp vụ trong route handler hoặc Server Action — các action/handler chỉ
  làm nhiệm vụ: parse input → validate (Zod) → gọi `service.ts` → map kết quả/lỗi cho UI.
  Nghiệp vụ quan trọng (state transition, tính tiền, kiểm tra tồn kho...) phải nằm trong
  `domain.ts`/`service.ts` để có thể unit test độc lập.
- `repository.ts` chỉ chứa câu truy vấn/ghi dữ liệu, không chứa quy tắc nghiệp vụ.
- Module có thể import từ `src/lib/*` và từ `domain.ts`/`schema.ts` của module khác, nhưng
  **không** import `repository.ts` của module khác trực tiếp — phải qua `service.ts` của module đó
  để giữ ranh giới rõ ràng giữa các domain.

## 4. Data fetching & mutation

- Server Components đọc dữ liệu qua `service.ts` (gọi trực tiếp trong RSC, không qua HTTP nội bộ).
- Mutation dùng Server Actions là lựa chọn mặc định; Route Handler dùng khi cần webhook, upload
  file, hoặc endpoint gọi từ ngoài Next.js.
- TanStack Query chỉ dùng cho dữ liệu client cần cache/poll/cập nhật tương tác cao (ví dụ Kanban
  kéo-thả cập nhật tiến độ, danh sách thông báo). Không dùng TanStack Query để thay thế Server
  Component cho dữ liệu chỉ đọc đơn giản.

## 5. Multi-tenant readiness

Xem chi tiết ở `docs/DATABASE.md` và `docs/RBAC.md`. Nguyên tắc kiến trúc: mọi `repository.ts` của
bảng thuộc garage phải nhận `garageId` làm tham số bắt buộc (không optional), và `garageId` đó luôn
được `service.ts` lấy từ session hiện tại — không bao giờ tin `garageId` gửi từ client.

## 6. File storage abstraction

`src/modules/media/` định nghĩa interface `FileStorage` (ví dụ: `upload()`, `getUrl()`,
`delete()`). Development dùng adapter local filesystem; production có thể thay bằng adapter
S3-compatible/Supabase Storage/Cloudinary mà không sửa domain layer (xem D7).

## 7. Danh sách module nghiệp vụ

`auth`, `users`, `garages`, `garage-members`, `customers`, `vehicles`, `vehicle-ownership`,
`appointments`, `repair-orders`, `inspections`, `quotations`, `work-tasks`, `services`, `parts`,
`inventory`, `invoices`, `payments`, `maintenance-records`, `vehicle-health`, `warranties`,
`notifications`, `media`, `audit-logs`, `reports`.

Mỗi module tương ứng một hoặc nhiều bảng trong `docs/DATABASE.md` và một nhóm route trong
`src/app/portal/*` hoặc `src/app/dashboard/*`.
