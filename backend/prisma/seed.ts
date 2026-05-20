import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { BusClass, BusType, OperatorStatus, PrismaClient, TripStatus, UserRole } from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const operatorSlogans: Array<{ companyName: string; slug: string; email: string }> = [
    { companyName: 'Alhamra', slug: 'alhamra', email: 'info@alhamra.com' },
    { companyName: 'Orin', slug: 'orin', email: 'info@orin.com' },
    { companyName: 'Hanif', slug: 'hanif', email: 'info@hanif.com' },
  ];

  const operatorIds = new Map<string, string>();
  for (const op of operatorSlogans) {
    const existing = await prisma.operator.findUnique({ where: { slug: op.slug } });
    if (existing) {
      operatorIds.set(op.slug, existing.id);
    } else {
      const created = await prisma.operator.create({
        data: {
          companyName: op.companyName,
          slug: op.slug,
          email: op.email,
          status: OperatorStatus.ACTIVE,
        },
      });
      operatorIds.set(op.slug, created.id);
      console.log(`Created operator: ${op.companyName}`);
    }
  }

  const cities = [
    'Chittagong',
    'Sylhet',
    'Rangpur',
    'Bogra',
    "Cox's Bazar",
    'Gaibandha',
  ] as const;

  const firstOperatorId = operatorIds.values().next().value!;

  const busDefinitions = [
    { name: 'Alhamra AC Coach 1', operatorSlug: 'alhamra', registrationNumber: 'AL-AC-001', seatCapacity: 28, busType: BusType.AC, busClass: BusClass.BUSINESS },
    { name: 'Alhamra AC Coach 2', operatorSlug: 'alhamra', registrationNumber: 'AL-AC-002', seatCapacity: 36, busType: BusType.AC, busClass: BusClass.ECONOMY },
    { name: 'Alhamra Non-AC Coach 1', operatorSlug: 'alhamra', registrationNumber: 'AL-NA-001', seatCapacity: 40, busType: BusType.NON_AC, busClass: BusClass.ECONOMY },
    { name: 'Alhamra Sleeper AC 1', operatorSlug: 'alhamra', registrationNumber: 'AL-SL-001', seatCapacity: 36, busType: BusType.SLEEPER, busClass: BusClass.BUSINESS },
    { name: 'Orin AC Coach 1', operatorSlug: 'orin', registrationNumber: 'OR-AC-001', seatCapacity: 28, busType: BusType.AC, busClass: BusClass.BUSINESS },
    { name: 'Orin AC Coach 2', operatorSlug: 'orin', registrationNumber: 'OR-AC-002', seatCapacity: 36, busType: BusType.AC, busClass: BusClass.ECONOMY },
    { name: 'Orin Non-AC Coach 1', operatorSlug: 'orin', registrationNumber: 'OR-NA-001', seatCapacity: 40, busType: BusType.NON_AC, busClass: BusClass.ECONOMY },
    { name: 'Orin Sleeper AC 1', operatorSlug: 'orin', registrationNumber: 'OR-SL-001', seatCapacity: 36, busType: BusType.SLEEPER, busClass: BusClass.BUSINESS },
    { name: 'Hanif AC Coach 1', operatorSlug: 'hanif', registrationNumber: 'HN-AC-001', seatCapacity: 28, busType: BusType.AC, busClass: BusClass.BUSINESS },
    { name: 'Hanif AC Coach 2', operatorSlug: 'hanif', registrationNumber: 'HN-AC-002', seatCapacity: 36, busType: BusType.AC, busClass: BusClass.ECONOMY },
    { name: 'Hanif Non-AC Coach 1', operatorSlug: 'hanif', registrationNumber: 'HN-NA-001', seatCapacity: 40, busType: BusType.NON_AC, busClass: BusClass.ECONOMY },
    { name: 'Hanif Sleeper AC 1', operatorSlug: 'hanif', registrationNumber: 'HN-SL-001', seatCapacity: 36, busType: BusType.SLEEPER, busClass: BusClass.BUSINESS },
  ] as const;

  let createdRoutes = 0;
  for (const city of cities) {
    for (const opId of operatorIds.values()) {
      createdRoutes += (
        await prisma.route.createMany({
          data: [
            { origin: 'Dhaka', destination: city, operatorId: opId },
            { origin: city, destination: 'Dhaka', operatorId: opId },
          ],
          skipDuplicates: true,
        })
      ).count;
    }
  }
  console.log(`Created routes: ${createdRoutes}`);

  let createdBuses = 0;
  for (const bus of busDefinitions) {
    const existing = await prisma.bus.findUnique({
      where: { registrationNumber: bus.registrationNumber },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    const { operatorSlug, ...busData } = bus;
    const opId = operatorIds.get(operatorSlug) ?? firstOperatorId;
    const createdBus = await prisma.bus.create({ data: { ...busData, operatorId: opId } });
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
    select: { id: true, operatorId: true, busType: true, busClass: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const removedTrips = await prisma.trip.deleteMany({});
  console.log(`Deleted existing trips: ${removedTrips.count}`);

  const scheduleSlots: Array<{
    hour: number;
    minute: number;
    matches: (b: { busType: BusType; busClass: BusClass }) => boolean;
  }> = [
    {
      hour: 7,
      minute: 0,
      matches: (b) => b.busType === BusType.NON_AC,
    },
    {
      hour: 10,
      minute: 0,
      matches: (b) =>
        b.busType === BusType.AC && b.busClass === BusClass.ECONOMY,
    },
    {
      hour: 15,
      minute: 0,
      matches: (b) =>
        b.busType === BusType.AC && b.busClass === BusClass.BUSINESS,
    },
    {
      hour: 19,
      minute: 0,
      matches: (b) => b.busType === BusType.NON_AC,
    },
    {
      hour: 23,
      minute: 0,
      matches: (b) => b.busType === BusType.SLEEPER,
    },
  ];

  const tripsToCreate: any[] = [];
  for (const slot of scheduleSlots) {
    for (const route of allRoutes) {
      const slotBuses = allBuses.filter(slot.matches);
      for (const bus of slotBuses) {
        const departureTime = new Date(today);
        departureTime.setHours(slot.hour, slot.minute, 0, 0);
        const arrivalTime = new Date(departureTime);
        arrivalTime.setHours(arrivalTime.getHours() + 6);
        const price = getTicketPrice(bus.busType, bus.busClass);

        tripsToCreate.push({
          routeId: route.id,
          busId: bus.id,
          operatorId: bus.operatorId,
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

  const hash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@easytrip.com' },
    update: {},
    create: {
      fullName: 'Super Admin',
      email: 'admin@easytrip.com',
      passwordHash: adminHash,
      phoneNumber: '+8801700000001',
      role: UserRole.ADMIN,
    },
  });
  console.log('Created admin: admin@easytrip.com / admin123');

  const operatorUsers = [
    { fullName: 'Alhamra Admin', email: 'alhamra@test.com', slug: 'alhamra' },
    { fullName: 'Orin Admin', email: 'orin@test.com', slug: 'orin' },
    { fullName: 'Hanif Admin', email: 'hanif@test.com', slug: 'hanif' },
  ];
  for (const u of operatorUsers) {
    const opId = operatorIds.get(u.slug);
    if (!opId) continue;
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        fullName: u.fullName,
        email: u.email,
        passwordHash: hash,
        phoneNumber: '+8801700000000',
        role: UserRole.OPERATOR,
        operatorId: opId,
      },
    });
    console.log(`Created operator admin: ${u.email} / password123`);
  }

  const staffUsers = [
    { fullName: 'Alhamra Staff', email: 'staff.alhamra@test.com', slug: 'alhamra' },
    { fullName: 'Orin Staff', email: 'staff.orin@test.com', slug: 'orin' },
    { fullName: 'Hanif Staff', email: 'staff.hanif@test.com', slug: 'hanif' },
  ];
  for (const u of staffUsers) {
    const opId = operatorIds.get(u.slug);
    if (!opId) continue;
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        fullName: u.fullName,
        email: u.email,
        passwordHash: hash,
        phoneNumber: '+8801700000000',
        role: UserRole.STAFF,
        operatorId: opId,
      },
    });
    console.log(`Created staff: ${u.email} / password123`);
  }

  await prisma.user.upsert({
    where: { email: 'passenger@test.com' },
    update: {},
    create: {
      fullName: 'Test Passenger',
      email: 'passenger@test.com',
      passwordHash: hash,
      phoneNumber: '+8801700000099',
      role: UserRole.USER,
    },
  });
  console.log('Created passenger: passenger@test.com / password123');
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