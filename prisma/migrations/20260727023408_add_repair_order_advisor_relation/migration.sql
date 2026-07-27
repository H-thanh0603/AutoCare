-- AddForeignKey
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
