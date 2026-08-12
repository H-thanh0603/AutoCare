-- DropForeignKey
ALTER TABLE "repair_order_sequences" DROP CONSTRAINT "repair_order_sequences_garageId_fkey";

-- DropIndex
DROP INDEX "customers_name_trgm_idx";

-- DropIndex
DROP INDEX "customers_phone_trgm_idx";

-- DropIndex
DROP INDEX "inspections_repairOrderId_idx";

-- DropIndex
DROP INDEX "parts_name_trgm_idx";

-- DropIndex
DROP INDEX "parts_sku_trgm_idx";

-- DropIndex
DROP INDEX "repair_orders_code_trgm_idx";

-- DropIndex
DROP INDEX "vehicles_licensePlate_trgm_idx";

-- DropIndex
DROP INDEX "vehicles_vin_trgm_idx";

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "scheduledAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "endsAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AddForeignKey
ALTER TABLE "repair_order_sequences" ADD CONSTRAINT "repair_order_sequences_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "garages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
