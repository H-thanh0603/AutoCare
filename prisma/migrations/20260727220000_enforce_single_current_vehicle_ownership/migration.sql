-- A vehicle can have only one open current owner. Prisma cannot express a
-- partial unique index, so this invariant lives in the database migration.
CREATE UNIQUE INDEX "vehicle_ownerships_one_current_vehicle_key"
ON "vehicle_ownerships" ("vehicleId")
WHERE "isCurrent" = true AND "endedAt" IS NULL;
