import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bookingsCount = await prisma.booking.count();
  const bookingSeatsCount = await prisma.bookingSeat.count();
  
  console.log(`Total Bookings: ${bookingsCount}`);
  console.log(`Total BookingSeats: ${bookingSeatsCount}`);
  
  const bookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  
  console.log('Last 5 Bookings:', JSON.stringify(bookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
