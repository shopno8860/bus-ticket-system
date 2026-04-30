-- 1) Add columns as nullable for existing rows
ALTER TABLE "Trip"
ADD COLUMN "boardingPoint" TEXT,
ADD COLUMN "droppingPoint" TEXT;

-- 2) Backfill from related route
UPDATE "Trip" t
SET
  "boardingPoint" = r."origin",
  "droppingPoint" = r."destination"
FROM "Route" r
WHERE t."routeId" = r."id";

-- 3) Safety fallback (should rarely be needed)
UPDATE "Trip"
SET
  "boardingPoint" = COALESCE("boardingPoint", 'Unknown Boarding'),
  "droppingPoint" = COALESCE("droppingPoint", 'Unknown Dropping')
WHERE "boardingPoint" IS NULL OR "droppingPoint" IS NULL;

-- 4) Enforce NOT NULL after data is populated
ALTER TABLE "Trip"
ALTER COLUMN "boardingPoint" SET NOT NULL,
ALTER COLUMN "droppingPoint" SET NOT NULL;
