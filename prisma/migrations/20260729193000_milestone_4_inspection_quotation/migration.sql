CREATE UNIQUE INDEX "inspections_repairOrderId_key" ON "inspections"("repairOrderId");

ALTER TABLE "quotations" ADD COLUMN "parentQuotationId" TEXT;

CREATE INDEX "quotations_parentQuotationId_idx" ON "quotations"("parentQuotationId");

ALTER TABLE "quotations"
  ADD CONSTRAINT "quotations_parentQuotationId_fkey"
  FOREIGN KEY ("parentQuotationId") REFERENCES "quotations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
