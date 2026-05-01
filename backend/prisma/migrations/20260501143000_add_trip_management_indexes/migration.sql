-- Improve trip management filtering and pagination performance
CREATE INDEX "Bus_operatorName_idx" ON "Bus"("operatorName");
CREATE INDEX "Route_origin_destination_idx" ON "Route"("origin", "destination");
CREATE INDEX "Trip_status_departureTime_idx" ON "Trip"("status", "departureTime");
