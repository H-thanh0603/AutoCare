-- ORDER BY createdAt within a garage (list pages, report windows).
CREATE INDEX "repair_orders_garageId_createdAt_idx" ON "repair_orders"("garageId", "createdAt");
CREATE INDEX "invoices_garageId_createdAt_idx" ON "invoices"("garageId", "createdAt");
