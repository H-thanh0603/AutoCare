# AutoCare — Hướng dẫn triển khai

## 1. Môi trường Development

### 1.1 PostgreSQL qua Docker Compose

Development chạy PostgreSQL bằng Docker Compose (xem D6 trong `docs/DECISIONS.md`). File
`docker-compose.yml` (tạo ở Milestone 1) tối thiểu gồm:

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: autocare
      POSTGRES_PASSWORD: autocare
      POSTGRES_DB: autocare_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

```bash
docker compose up -d
```

### 1.2 Environment variables

Tạo `.env` từ `.env.example` (tạo ở Milestone 1), tối thiểu:

```
DATABASE_URL="postgresql://autocare:autocare@localhost:5432/autocare_dev"
AUTH_SECRET="<random-32-byte-secret>"        # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"          # nếu Auth.js yêu cầu
FILE_STORAGE_DRIVER="local"                   # local | s3 | supabase | cloudinary (tương lai)
```

`.env` **không được commit**; chỉ commit `.env.example` với giá trị mẫu vô hại.

### 1.3 Chạy ứng dụng

```bash
pnpm install
pnpm prisma migrate dev      # áp dụng migration, tạo DB schema
pnpm db:seed                 # CHỈ cho dev: nạp dữ liệu demo (prisma/seed.ts)
pnpm dev                     # http://localhost:3000
```

> ⚠️ **Tuyệt đối KHÔNG chạy `db:seed` trên database production.** Seed xóa toàn bộ dữ liệu
> (`deleteMany` mọi bảng) và tạo tài khoản với mật khẩu demo công khai. Từ nay script seed
> tự từ chối chạy khi `NODE_ENV=production` trừ khi đặt `ALLOW_DEMO_SEED="1"` một cách
> rõ ràng.

Các lệnh kiểm tra:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm vitest run
pnpm exec playwright test
pnpm build
```

(Package manager thực tế theo `pnpm-workspace.yaml` đã có trong repo — dùng `pnpm`.)

## 2. Production

- **HTTPS bắt buộc** — TLS termination ở reverse proxy (Nginx/Caddy) hoặc nền tảng hosting
  (Vercel, Railway, VPS + Caddy...). Cookie session chỉ set `Secure` khi chạy qua HTTPS.
- Database production: PostgreSQL managed (ví dụ Supabase, Neon, RDS) hoặc self-host — migration
  chạy bằng `prisma migrate deploy` (không dùng `migrate dev` ở production).
- **Không chạy `prisma db seed` ở production** — seed chỉ dành cho môi trường dev (script đã tự
  chặn, xem mục 1.3). Tài khoản admin/staff production phải được tạo bằng quy trình đăng ký
  bình thường hoặc một script bootstrap riêng đọc mật khẩu từ secret manager.
- File storage production: đổi `FILE_STORAGE_DRIVER` sang adapter S3-compatible/Supabase Storage/
  Cloudinary (xem D7) — không cần sửa domain layer.
- Build: `pnpm build` rồi `pnpm start`, hoặc deploy serverless (Vercel) nếu phù hợp với chi phí dự
  án một-người-phát-triển.
- Secret production (`DATABASE_URL`, `AUTH_SECRET`, storage credentials) cấu hình qua biến môi
  trường của nền tảng hosting, không lưu trong repo.

## 3. Backup (định hướng, chi tiết hóa ở Milestone 9)

- Backup định kỳ PostgreSQL (`pg_dump`) theo lịch, lưu ngoài server chính.
- Kiểm tra khôi phục (restore drill) trước khi công bố sẵn sàng production thật.

## 4. Ghi chú

Tài liệu này mô tả hướng triển khai đã chốt ở Milestone 0. Chi tiết cụ thể (script CI/CD, nhà cung
cấp hosting cuối cùng) sẽ được hoàn thiện ở Milestone 9 — Production readiness, theo
`<development_phases>` trong `prompt.md`.
