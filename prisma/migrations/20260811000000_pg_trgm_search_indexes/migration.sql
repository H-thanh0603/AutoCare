-- GIN trigram indexes for %substring% search over garage-scoped data.
-- Prisma `contains` + `mode: insensitive` compiles to `ILIKE '%…%'`, which a
-- btree cannot serve; the trigram opclass turns those into index scans instead
-- of sequential scans. Indexes are per-column so the garageId predicate still
-- filters through a btree index before/with the trigram scan.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" ON "customers" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx" ON "customers" USING gin ("phone" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "vehicles_licensePlate_trgm_idx" ON "vehicles" USING gin ("licensePlate" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "vehicles_vin_trgm_idx" ON "vehicles" USING gin ("vin" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "repair_orders_code_trgm_idx" ON "repair_orders" USING gin ("code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "parts_name_trgm_idx" ON "parts" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "parts_sku_trgm_idx" ON "parts" USING gin ("sku" gin_trgm_ops);
