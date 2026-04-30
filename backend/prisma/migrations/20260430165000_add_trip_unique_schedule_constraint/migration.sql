-- Add unique protection for generated schedule slots
CREATE UNIQUE INDEX "Trip_routeId_busId_departureTime_key"
ON "Trip"("routeId", "busId", "departureTime");
