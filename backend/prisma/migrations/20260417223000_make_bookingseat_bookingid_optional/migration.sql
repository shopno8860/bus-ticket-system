-- Allow seat locks to exist before a booking is confirmed.
ALTER TABLE "BookingSeat"
ALTER COLUMN "bookingId" DROP NOT NULL;
