# Moc 4 - Kiem tra va bao gia

Trang thai: **Hoan thanh co dieu kien**
Ngay hoan thanh: 2026-07-29

## Pham vi hoan thanh

- Mot phieu inspection cho moi repair order; staff bat dau, luu finding va audit trong transaction.
- Media upload token co the gan `inspectionItemId`; service kiem tra item cung garage/repair order truoc presign va complete, luu lien ket va audit.
- Bao gia tinh tien VND o server, draft/send/revision immutable, notification link den portal quote.
- Customer chi duyet item cua xe dang so huu; manager co service/action duyet trong garage voi ly do toi thieu 10 ky tu va audit metadata.
- Seed supplementary quotation lien ket voi quotation goc va notification seed mo dung quotation portal.
- E2E M4 tao fixture repair order tam, staff kiem tra/lap/gui bao gia qua UI, customer duyet qua portal, sau do fixture tu don dep.

## Kiem chung

- `prisma validate`: dat.
- `prisma migrate status`: dat, database schema up to date.
- `pnpm test`: 79/79 dat.
- `pnpm test:integration`: 28/28 dat.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: dat.
- `playwright test`: 6/6 dat, gom luong M4 staff-to-customer.
- `git diff --check`: dat.

## Gioi han moi truong

- Khong chay `db:reset`/`db:seed` trong lan nay vi reset se xoa du lieu local hien co.
- Build va E2E co warning hien co cua Next.js ve workspace root/middleware va Base UI button semantics; khong lam test that bai va ngoai pham vi M4.
