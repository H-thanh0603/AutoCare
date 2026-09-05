# AutoCare — Yêu cầu bảo mật

Nguồn: `<security_requirements>` trong `prompt.md`. Tài liệu này diễn giải thành hành động cụ thể
cho từng hạng mục; không lặp lại danh sách gốc mà không có chi tiết triển khai.

## 1. Authentication

- Auth.js v5, **credentials provider** (email + password) cho MVP một garage (xem
  `docs/DECISIONS.md` D3). Password hash bằng `bcryptjs` (cost factor tối thiểu 10).
- Session dạng JWT (Auth.js session strategy `jwt`), payload chỉ chứa `userId`, `role`,
  `garageId` (nếu là nhân sự garage), `customerId` (nếu là CUSTOMER) — không chứa dữ liệu nhạy
  cảm khác.
- Cookie session: `HttpOnly`, `Secure` (bắt buộc bật khi `NODE_ENV=production`, tức khi chạy
  HTTPS), `SameSite=Lax` (đủ để chặn CSRF cơ bản cho GET, kết hợp CSRF token cho mutation nếu
  Server Action không tự bảo vệ — xem mục 3).
- HTTPS bắt buộc ở production (reverse proxy/hosting đảm nhiệm TLS termination).

## 2. Rate limiting

- Bắt buộc cho: endpoint đăng nhập (`/api/auth/*` hoặc route login), và các endpoint nhạy cảm
  khác (tạo share link, upload media, gửi báo giá).
- Rate limit theo IP + theo tài khoản. Khi `REDIS_URL` được cấu hình, giới hạn
  được thực thi phân tán qua Redis (dùng chung cho mọi instance); khi để trống,
  fallback về store trong bộ nhớ tiến trình (chỉ phù hợp dev single-instance,
  KHÔNG dùng cho multi-instance/serverless production).
- Giới hạn đề xuất: đăng nhập tối đa 5 lần thất bại/15 phút/IP+email, sau đó khóa tạm thời và trả
  thông báo rõ ràng không lộ chi tiết (không nói "sai password" khác với "không tồn tại email").

## 3. CSRF

- Server Actions của Next.js có bảo vệ CSRF mặc định (kiểm tra `Origin`/`Referer` cho request
  same-origin). Với Route Handler xử lý mutation (ví dụ webhook nội bộ, upload), áp dụng kiểm tra
  `Origin` thủ công hoặc CSRF token khi endpoint được gọi từ form HTML truyền thống.

## 4. Input validation & output escaping

- Mọi input từ client (Server Action, Route Handler) validate bằng Zod schema (`schema.ts` của
  module) **trước khi** vào service layer. Client-side validation (React Hook Form + Zod) chỉ là
  UX, không phải nguồn xác thực cuối cùng.
- React tự động escape output trong JSX; các trường hợp cần `dangerouslySetInnerHTML` (nếu có,
  ví dụ mô tả rich text) phải sanitize trước bằng thư viện đã được kiểm chứng.

## 5. Upload file

- Kiểm tra MIME type thực tế (đọc magic bytes, không chỉ tin `Content-Type` header) và giới hạn
  dung lượng tối đa mỗi file (đề xuất: ảnh ≤ 10MB, tối đa N ảnh/lượt upload — chốt số cụ thể khi
  triển khai module `media`).
- Danh sách MIME cho phép: ảnh (`image/jpeg`, `image/png`, `image/webp`) và tài liệu cần thiết
  (`application/pdf` cho biên bản/giấy tờ nếu cần). **Không cho phép** file thực thi
  (`.exe`, `.sh`, `.bat`, script) hoặc file không nằm trong whitelist.
- File lưu qua `FileStorage` abstraction (`docs/ARCHITECTURE.md` mục 6); tên file lưu trữ generate
  ngẫu nhiên (không dùng tên gốc từ client trực tiếp) để tránh path traversal/collision.

## 6. Dữ liệu thanh toán

- **Không lưu dữ liệu thẻ ngân hàng** trong hệ thống AutoCare. `Payment` chỉ lưu phương thức
  (tiền mặt, chuyển khoản, POS...), số tiền, thời điểm, người ghi nhận — không lưu số thẻ/CVV.

## 7. Logging & error handling

- Không log password, token, session, hoặc bất kỳ secret nào (kiểm tra khi thêm logging mới).
- Không trả stack trace hoặc chi tiết lỗi nội bộ cho client; dùng `src/lib/errors.ts` để map lỗi
  nội bộ thành message thân thiện, log chi tiết đầy đủ ở server (Node console/log service).

## 8. Audit log bắt buộc

Ghi `AuditLog` (bảng riêng, `garageId`, `actorUserId`, `action`, `entityType`, `entityId`, `before`,
`after`, `createdAt`) cho các hành động:

- Thay đổi báo giá (tạo phiên bản mới, sửa nội dung khi còn DRAFT).
- Duyệt báo giá / hạng mục báo giá.
- Xuất kho và điều chỉnh kho.
- Tạo/sửa/hủy hóa đơn.
- Thanh toán và hoàn tiền.
- Chuyển chủ xe.
- Thay đổi kilomet bất thường (giảm so với lần trước).
- Tạo hoặc thu hồi share link.

## 9. Secret management

- Mọi secret (`DATABASE_URL`, `AUTH_SECRET`, credential storage provider...) chỉ đọc từ
  environment variable, không hard-code trong source.
- Repository có `.env.example` liệt kê đầy đủ biến cần thiết với giá trị mẫu vô hại; `.env` thật
  không commit (đã có trong `.gitignore`).

## 10. Tenant isolation (liên kết với `docs/RBAC.md`)

- Mọi truy vấn dữ liệu garage scope theo `garageId` lấy từ session, không tin giá trị client gửi.
- Ít nhất một integration test xác minh user garage A không đọc/sửa được dữ liệu garage B.
