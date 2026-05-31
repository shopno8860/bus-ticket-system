-- Convert legacy R#C# seat numbers to passenger-friendly labels (A1, B2, …)
UPDATE "Seat"
SET "seatNumber" = CHR(64 + "rowNumber") || "columnNumber"::text
WHERE "seatNumber" ~ '^R[0-9]+C[0-9]+$'
  AND "rowNumber" IS NOT NULL
  AND "columnNumber" IS NOT NULL
  AND "rowNumber" BETWEEN 1 AND 26;

-- Upper-deck sleeper: U01 → UA1
UPDATE "Seat"
SET "seatNumber" = 'U' || CHR(64 + "rowNumber") || "columnNumber"::text
WHERE "seatNumber" ~ '^U[0-9]{2}$'
  AND "rowNumber" IS NOT NULL
  AND "columnNumber" IS NOT NULL
  AND "rowNumber" BETWEEN 1 AND 6;

-- Lower-deck sleeper: L01 → LA1
UPDATE "Seat"
SET "seatNumber" = 'L' || CHR(64 + ("rowNumber" - 6)) || ("columnNumber" - 3)::text
WHERE "seatNumber" ~ '^L[0-9]{2}$'
  AND "rowNumber" IS NOT NULL
  AND "columnNumber" IS NOT NULL
  AND "rowNumber" BETWEEN 7 AND 12
  AND "columnNumber" >= 4;
