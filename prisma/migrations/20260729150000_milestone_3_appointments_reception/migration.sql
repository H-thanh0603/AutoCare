CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  ALTER COLUMN "scheduledAt" TYPE TIMESTAMPTZ USING "scheduledAt" AT TIME ZONE 'UTC';
ALTER TABLE "appointments" ADD COLUMN "endsAt" TIMESTAMPTZ;
UPDATE "appointments" SET "endsAt" = "scheduledAt" + INTERVAL '1 hour' WHERE "endsAt" IS NULL;
ALTER TABLE "appointments" ALTER COLUMN "endsAt" SET NOT NULL;
CREATE INDEX "appointments_vehicleId_status_idx" ON "appointments"("vehicleId", "status");

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_valid_range" CHECK ("endsAt" > "scheduledAt"),
  ADD CONSTRAINT "appointments_open_vehicle_time_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("scheduledAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "repair_orders" ADD COLUMN "intakeChecklist" JSONB;

CREATE TABLE "repair_order_sequences" (
  "id" TEXT PRIMARY KEY,
  "garageId" TEXT NOT NULL REFERENCES "garages"("id"),
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  UNIQUE ("garageId", "year")
);

CREATE UNIQUE INDEX "media_storageKey_key" ON "media"("storageKey");
