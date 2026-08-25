-- Migration 20260812143706_change_id_to_uuid dropped these indexes (it was
-- actually a redundant timestamptz re-do) and never recreated them, leaving
-- every ILIKE '%…%' search as a sequential scan. Restore all of them.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" ON "customers" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx" ON "customers" USING gin ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "vehicles_licensePlate_trgm_idx" ON "vehicles" USING gin ("licensePlate" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "vehicles_vin_trgm_idx" ON "vehicles" USING gin ("vin" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "repair_orders_code_trgm_idx" ON "repair_orders" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "parts_name_trgm_idx" ON "parts" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "parts_sku_trgm_idx" ON "parts" USING gin ("sku" gin_trgm_ops);

-- Plain btree index also dropped by the same migration.
CREATE INDEX IF NOT EXISTS "inspections_repairOrderId_idx" ON "inspections"("repairOrderId");
