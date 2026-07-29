# Mốc 3 — Lịch hẹn và tiếp nhận

Trạng thái: **Hoàn thành có điều kiện**
Ngày hoàn thành: 2026-07-29

## Phạm vi hoàn thành

- Appointment có `endsAt`; PostgreSQL exclusion constraint chặn overlap `PENDING`/`CONFIRMED` trên cùng xe.
- Garage settings lưu slot 60 phút và giờ làm việc từng ngày; manager cập nhật tại `/cai-dat`.
- Customer đặt, hủy, đổi lịch; garage xác nhận, no-show, hủy và tiếp nhận.
- Check-in và walk-in tạo `RepairOrder.RECEIVED`, mã `RO-YYYY-####`, mileage log/currentKm và audit trong transaction.
- UI M3: `/lich-hen`, `/tai-khoan/lich-hen/moi`, `/tai-khoan/lich-hen/[id]`, `/lenh-sua-chua/[id]`.
- Private S3 flow: presign PUT, complete after `HeadObject` + signature validation, Media/audit transaction, presigned GET download. Input giới hạn JPEG/PNG/WEBP/PDF, tối đa 10 MB.

## Kiểm chứng

- `pnpm db:seed`: đạt.
- `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`: đạt sau khi Vitest load local `.env` cho unit repository test.
- `pnpm test:e2e`: 5/5 đạt sau `pnpm db:seed` khi truyền credentials demo tạm; M3 E2E đặt lịch hôm nay và xác nhận lễ tân thấy đúng nhu cầu sửa chữa.

## Gaps đã biết

1. S3 live upload/download chưa xác minh vì local `.env` chưa có `AWS_S3_BUCKET` và AWS credentials. Unit validation/build đã đạt.
2. Next.js báo warning `middleware.ts` deprecated; chuyển sang `proxy.ts` là việc hygiene ngoài phạm vi M3.

## Security review

- Garage scope lấy từ session cho mọi staff media action.
- Customer download scope qua customer + current vehicle ownership.
- Client không gửi storage key, garage ID hoặc download URL.
- Upload token HMAC gắn user, repair order, type, size, expiry 5 phút.
- Không thấy secret trong file thay đổi; `.env` không được đọc/commit.
