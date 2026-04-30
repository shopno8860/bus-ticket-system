import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { BusClass, BusType, PrismaClient, TripStatus } from '@prisma/client';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const cities = [
    'Chittagong',
    'Sylhet',
    'Rangpur',
    'Bogra',
    "Cox's Bazar",
    'Gaibandha',
  ] as const;

  const buses = [
    {
      name: 'Alhamra AC Coach 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Alhamra AC Coach 2',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-AC-002',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Alhamra Non-AC Coach 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Alhamra Sleeper AC 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Orin AC Coach 1',
      operatorName: 'Orin',
      registrationNumber: 'OR-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Orin AC Coach 2',
      operatorName: 'Orin',
      registrationNumber: 'OR-AC-002',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Orin Non-AC Coach 1',
      operatorName: 'Orin',
      registrationNumber: 'OR-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Orin Sleeper AC 1',
      operatorName: 'Orin',
      registrationNumber: 'OR-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Hanif AC Coach 1',
      operatorName: 'Hanif',
      registrationNumber: 'HN-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Hanif AC Coach 2',
      operatorName: 'Hanif',
      registrationNumber: 'HN-AC-002',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Hanif Non-AC Coach 1',
      operatorName: 'Hanif',
      registrationNumber: 'HN-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Hanif Sleeper AC 1',
      operatorName: 'Hanif',
      registrationNumber: 'HN-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.BUSINESS,
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

  const allRoutes = await prisma.route.findMany({
    select: { id: true, origin: true, destination: true },
  });
  const allBuses = await prisma.bus.findMany({
    select: { id: true, busType: true, busClass: true },
  });

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

  const tripsToCreate: any[] = [];
  for (let hour = 7; hour <= 23; hour += 2) {
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
        const price = getTicketPrice(bus.busType, bus.busClass);

        tripsToCreate.push({
          routeId: route.id,
          busId: bus.id,
          boardingPoint: route.origin,
          droppingPoint: route.destination,
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
    const deckRows = 6;
    const seatsPerDeckRow = 3;
    const seatsPerDeck = deckRows * seatsPerDeckRow;

    return Array.from({ length: 36 }, (_, index) => {
      const isUpperDeck = index < seatsPerDeck;
      const seatIndex = isUpperDeck ? index : index - seatsPerDeck;
      const deckPrefix = isUpperDeck ? 'U' : 'L';
      return {
        busId,
        seatNumber: `${deckPrefix}${String(seatIndex + 1).padStart(2, '0')}`,
        rowNumber:
          Math.floor(seatIndex / seatsPerDeckRow) + 1 + (isUpperDeck ? 0 : deckRows),
        columnNumber:
          (seatIndex % seatsPerDeckRow) + 1 + (isUpperDeck ? 0 : seatsPerDeckRow),
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

function getTicketPrice(busType: BusType, busClass: BusClass): number {
  if (busType === BusType.SLEEPER) {
    return 1400;
  }

  if (busType === BusType.NON_AC) {
    return 700;
  }

  if (busType === BusType.AC && busClass === BusClass.BUSINESS) {
    return 1000;
  }

  if (busType === BusType.AC && busClass === BusClass.ECONOMY) {
    return 800;
  }

  return 800;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());