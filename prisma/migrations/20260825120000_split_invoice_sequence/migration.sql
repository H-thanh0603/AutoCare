-- Split the shared per-garage/year counter so invoices and repair orders get
-- independent, gap-free sequential numbers (VN accounting expectation).
ALTER TABLE "repair_order_sequences" ADD COLUMN "docType" TEXT NOT NULL DEFAULT 'REPAIR_ORDER';

DROP INDEX "repair_order_sequences_garageId_year_key";
CREATE UNIQUE INDEX "repair_order_sequences_garageId_year_docType_key"
  ON "repair_order_sequences"("garageId", "year", "docType");

-- Existing rows were a shared counter; they keep serving REPAIR_ORDER numbers.
-- Seed an INVOICE row per garage/year starting from the shared nextValue so new
-- INV-* codes cannot collide with any already issued from the old counter.
INSERT INTO "repair_order_sequences" ("id", "garageId", "year", "docType", "nextValue")
SELECT gen_random_uuid()::text, "garageId", "year", 'INVOICE', "nextValue"
FROM "repair_order_sequences";
