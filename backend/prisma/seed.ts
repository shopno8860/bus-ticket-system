import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { BusClass, BusType, Prisma, PrismaClient, TripStatus } from '@prisma/client';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const cities = [
    'Chittagong',
    'Sylhet',
    'Rajshahi',
    'Khulna',
    'Barisal',
    'Rangpur',
    'Bogra',
    'Cumilla',
    'Feni',
    "Cox's Bazar",
    'Bandarban',
    'Rangamati',
    'Kuakata',
    'Gaibandha',
    'Kurigram',
    'Panchagarh',
    'Dinajpur',
  ] as const;

  const buses = [
    {
      name: 'Green Line Coach 1',
      operatorName: 'Green Line',
      registrationNumber: 'GL-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Hanif Express 1',
      operatorName: 'Hanif',
      registrationNumber: 'HN-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Shohag Sleeper 1',
      operatorName: 'Shohag',
      registrationNumber: 'SH-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
    },
  ] as const;

  let createdRoutes = 0;
  for (const city of cities) {
    createdRoutes += (
      await prisma.route.createMany({
        data: { origin: 'Dhaka', destination: city },
        skipDuplicates: true,
      })
    ).count;
    createdRoutes += (
      await prisma.route.createMany({
        data: { origin: city, destination: 'Dhaka' },
        skipDuplicates: true,
      })
    ).count;
  }
  console.log(`Created routes: ${createdRoutes}`);

  let createdBuses = 0;
  for (const bus of buses) {
    const existing = await prisma.bus.findUnique({
      where: { registrationNumber: bus.registrationNumber },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    const createdBus = await prisma.bus.create({ data: bus });
    await prisma.seat.createMany({
      data: buildSeats(createdBus.id, createdBus.busClass, createdBus.busType),
      skipDuplicates: true,
    });
    createdBuses += 1;
  }
  console.log(`Created buses: ${createdBuses}`);

  const allRoutes = await prisma.route.findMany({ select: { id: true } });
  const allBuses = await prisma.bus.findMany({ select: { id: true } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingTrips = await prisma.trip.findMany({
    where: {
      departureTime: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      routeId: true,
      busId: true,
      departureTime: true,
    },
  });

  const existingTripKeys = new Set(
    existingTrips.map(
      (trip) => `${trip.routeId}::${trip.busId}::${trip.departureTime.toISOString()}`,
    ),
  );

  const tripsToCreate: Prisma.TripCreateManyInput[] = [];
  for (let hour = 7; hour <= 23; hour += 1) {
    for (const route of allRoutes) {
      for (const bus of allBuses) {
        const departureTime = new Date(today);
        departureTime.setHours(hour, 0, 0, 0);
        const key = `${route.id}::${bus.id}::${departureTime.toISOString()}`;
        if (existingTripKeys.has(key)) {
          continue;
        }
        const arrivalTime = new Date(departureTime);
        arrivalTime.setHours(arrivalTime.getHours() + 6);
        const price = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;

        tripsToCreate.push({
          routeId: route.id,
          busId: bus.id,
          departureTime,
          arrivalTime,
          price: price.toFixed(2),
          status: TripStatus.SCHEDULED,
        });
      }
    }
  }

  if (tripsToCreate.length > 0) {
    const result = await prisma.trip.createMany({
      data: tripsToCreate,
      skipDuplicates: true,
    });
    console.log(`Created trips: ${result.count}`);
  } else {
    console.log('No missing trips to create for today.');
  }
}

function buildSeats(busId: string, busClass: BusClass, busType: BusType) {
  if (busType === BusType.SLEEPER) {
    return Array.from({ length: 36 }, (_, index) => {
      const isUpperDeck = index < 18;
      const seatIndex = isUpperDeck ? index : index - 18;
      const deckPrefix = isUpperDeck ? 'U' : 'L';
      return {
        busId,
        seatNumber: `${deckPrefix}${String(seatIndex + 1).padStart(2, '0')}`,
        rowNumber: Math.floor(seatIndex / 2) + 1 + (isUpperDeck ? 0 : 9),
        columnNumber: (seatIndex % 2) + 1 + (isUpperDeck ? 0 : 2),
      };
    });
  }

  const columnsPerRow = busClass === BusClass.BUSINESS ? 3 : 4;
  const totalSeats = busClass === BusClass.BUSINESS ? 28 : 36;

  return Array.from({ length: totalSeats }, (_, index) => {
    const rowNumber = Math.floor(index / columnsPerRow) + 1;
    const columnNumber = (index % columnsPerRow) + 1;
    return {
      busId,
      seatNumber: `R${rowNumber}C${columnNumber}`,
      rowNumber,
      columnNumber,
    };
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());