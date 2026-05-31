import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BookingSeatStatus,
  BookingStatus,
  BusClass,
  BusStatus,
  BusType,
  OperatorStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  RefundStatus,
  TripStatus,
  UserRole,
} from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import {
  formatPassengerSeatNumber,
  formatSleeperSeatNumber,
} from '../src/common/utils/seat-label.util';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and set DATABASE_URL.',
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ===== Operators (2 total) =====
  const operators: Array<{
    companyName: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
  }> = [
    {
      companyName: 'Alhamra Paribahan',
      slug: 'alhamra-paribahan',
      email: 'info@alhamra.com',
      phone: '+8801700000101',
      address: 'Kallyanpur, Dhaka',
    },
    {
      companyName: 'Hanif Enterprise',
      slug: 'hanif-enterprise',
      email: 'info@hanif.com',
      phone: '+8801700000202',
      address: 'Sayedabad, Dhaka',
    },
  ];

  const operatorBySlug = new Map<
    string,
    { id: string; slug: string; companyName: string }
  >();
  for (const op of operators) {
    const bySlug = await prisma.operator.findUnique({
      where: { slug: op.slug },
      select: { id: true, slug: true, companyName: true },
    });

    const byCompany = !bySlug
      ? await prisma.operator.findUnique({
          where: { companyName: op.companyName },
          select: { id: true, slug: true, companyName: true },
        })
      : null;

    const target = bySlug ?? byCompany;
    const desiredSlug = op.slug;

    const slugTaken =
      target?.slug === desiredSlug
        ? false
        : Boolean(
            await prisma.operator.findUnique({
              where: { slug: desiredSlug },
              select: { id: true },
            }),
          );

    const saved = target
      ? await prisma.operator.update({
          where: { id: target.id },
          data: {
            companyName: op.companyName,
            slug: slugTaken ? target.slug : desiredSlug,
            email: op.email,
            phone: op.phone,
            address: op.address,
            status: OperatorStatus.ACTIVE,
          },
          select: { id: true, slug: true, companyName: true },
        })
      : await prisma.operator.create({
          data: {
            companyName: op.companyName,
            slug: desiredSlug,
            email: op.email,
            phone: op.phone,
            address: op.address,
            status: OperatorStatus.ACTIVE,
          },
          select: { id: true, slug: true, companyName: true },
        });
    operatorBySlug.set(op.slug, saved);
  }

  // ===== Users (admin + operator admins + staff + passengers) =====
  const adminEmail = 'admin@demo.com';
  const adminPassword = '12345678';
  const commonPassword = '12345678';

  const [adminPasswordHash, commonPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(commonPassword, 10),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { fullName: 'Demo Admin', role: UserRole.ADMIN },
    create: {
      fullName: 'Demo Admin',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      phoneNumber: '+8801700000000',
      role: UserRole.ADMIN,
    },
    select: { id: true, email: true },
  });

  const operatorAdmins: Array<{ id: string; operatorId: string; email: string }> = [];
  for (const op of operators) {
    const operatorId = operatorBySlug.get(op.slug)!.id;
    const email = `${op.slug.replace(/[^a-z0-9]+/gi, '')}@demo.com`.toLowerCase();

    const u = await prisma.user.upsert({
      where: { email },
      update: {
        fullName: `${op.companyName} Admin`,
        role: UserRole.OPERATOR,
        operatorId,
      },
      create: {
        fullName: `${op.companyName} Admin`,
        email,
        passwordHash: commonPasswordHash,
        phoneNumber: op.phone,
        role: UserRole.OPERATOR,
        operatorId,
      },
      select: { id: true, operatorId: true, email: true },
    });
    if (!u.operatorId) {
      throw new Error(`Seed invariant failed: operator admin ${email} has null operatorId`);
    }
    operatorAdmins.push({ id: u.id, operatorId: u.operatorId, email: u.email });
  }

  const staffEmails: string[] = [];
  for (const op of operators) {
    const operatorId = operatorBySlug.get(op.slug)!.id;
    const base = op.slug.replace(/[^a-z0-9]+/gi, '').toLowerCase();
    const staffList = [
      { fullName: `${op.companyName} Staff 1`, email: `staff1.${base}@demo.com` },
      { fullName: `${op.companyName} Staff 2`, email: `staff2.${base}@demo.com` },
      { fullName: `${op.companyName} Staff 3`, email: `staff3.${base}@demo.com` },
    ];
    for (const s of staffList) {
      await prisma.user.upsert({
        where: { email: s.email },
        update: { fullName: s.fullName, role: UserRole.STAFF, operatorId },
        create: {
          fullName: s.fullName,
          email: s.email,
          passwordHash: commonPasswordHash,
          phoneNumber: '+8801700000999',
          role: UserRole.STAFF,
          operatorId,
        },
      });
      staffEmails.push(s.email);
    }
  }

  const passengerSeed: Array<{ fullName: string; email: string; phone: string }> =
    [
      { fullName: 'Ayesha Rahman', email: 'ayesha@demo.com', phone: '+8801700001001' },
      { fullName: 'Tanvir Hossain', email: 'tanvir@demo.com', phone: '+8801700001002' },
      { fullName: 'Nusrat Jahan', email: 'nusrat@demo.com', phone: '+8801700001003' },
      { fullName: 'Mehedi Hasan', email: 'mehedi@demo.com', phone: '+8801700001004' },
      { fullName: 'Sadia Islam', email: 'sadia@demo.com', phone: '+8801700001005' },
      { fullName: 'Rafiul Karim', email: 'rafiul@demo.com', phone: '+8801700001006' },
    ];

  const passengers: Array<{ id: string; fullName: string; email: string }> = [];
  for (const p of passengerSeed) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: { fullName: p.fullName, role: UserRole.USER },
      create: {
        fullName: p.fullName,
        email: p.email,
        passwordHash: commonPasswordHash,
        phoneNumber: p.phone,
        role: UserRole.USER,
      },
      select: { id: true, fullName: true, email: true },
    });
    passengers.push(u);
  }

  // ===== Routes (5-8) per operator =====
  const routePairs: Array<{ origin: string; destination: string }> = [
    { origin: 'Dhaka', destination: 'Chattogram' },
    { origin: 'Dhaka', destination: 'Rangpur' },
    { origin: 'Dhaka', destination: 'Gaibandha' },
    { origin: 'Dhaka', destination: 'Rajshahi' },
    { origin: 'Dhaka', destination: "Cox's Bazar" },
    { origin: 'Dhaka', destination: 'Sylhet' },
  ];

  for (const op of operators) {
    const operatorId = operatorBySlug.get(op.slug)!.id;
    await prisma.route.createMany({
      data: [
        ...routePairs.map((r) => ({
          operatorId,
          origin: r.origin,
          destination: r.destination,
        })),
        ...routePairs.map((r) => ({
          operatorId,
          origin: r.destination,
          destination: r.origin,
        })),
      ],
      skipDuplicates: true,
    });
  }

  // Boarding/dropping points per route (required at booking confirm).
  const dhakaRangpurBoarding = [
    'Gabtoli Bus Terminal',
    'Technical',
    'Kallyanpur',
    'Shyamoli',
    'Mohakhali',
    'Airport',
    'Abdullahpur',
  ];
  const dhakaRangpurDropping = [
    'Gobindaganj',
    'Palashbari',
    'Gaibandha',
    'Mithapukur',
    'Modern Mor',
    'Jahaj Company Mor',
    'Rangpur Bus Terminal',
  ];

  const normalizeCityName = (value: string) => value.trim().toLowerCase();

  const routesForPoints = await prisma.route.findMany({
    select: { id: true, operatorId: true, origin: true, destination: true },
  });
  for (const route of routesForPoints) {
    const isDhakaRangpur =
      normalizeCityName(route.origin) === 'dhaka' &&
      normalizeCityName(route.destination) === 'rangpur';

    const boardingNames = isDhakaRangpur
      ? dhakaRangpurBoarding
      : [`${route.origin} Central`];
    const droppingNames = isDhakaRangpur
      ? dhakaRangpurDropping
      : [`${route.destination} Central`];

    for (const name of boardingNames) {
      await prisma.boardingPoint.upsert({
        where: { routeId_name: { routeId: route.id, name } },
        update: { isActive: true },
        create: {
          operatorId: route.operatorId,
          routeId: route.id,
          name,
          address: `${name}, ${route.origin}`,
          isActive: true,
        },
      });
    }
    for (const name of droppingNames) {
      await prisma.droppingPoint.upsert({
        where: { routeId_name: { routeId: route.id, name } },
        update: { isActive: true },
        create: {
          operatorId: route.operatorId,
          routeId: route.id,
          name,
          address: `${name}, ${route.destination}`,
          isActive: true,
        },
      });
    }
  }

  // ===== Buses (3-5) per operator + seats =====
  const busesToEnsure: Array<{
    operatorSlug: string;
    name: string;
    registrationNumber: string;
    seatCapacity: number;
    busType: BusType;
    busClass: BusClass;
  }> = [
    // Alhamra (5)
    {
      operatorSlug: 'alhamra-paribahan',
      name: 'Alhamra AC Business 01',
      registrationNumber: 'ALH-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      operatorSlug: 'alhamra-paribahan',
      name: 'Alhamra AC Economy 02',
      registrationNumber: 'ALH-AC-002',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.ECONOMY,
    },
    {
      operatorSlug: 'alhamra-paribahan',
      name: 'Alhamra Non-AC 03',
      registrationNumber: 'ALH-NA-003',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      operatorSlug: 'alhamra-paribahan',
      name: 'Alhamra Sleeper 04',
      registrationNumber: 'ALH-SL-004',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.BUSINESS,
    },
    {
      operatorSlug: 'alhamra-paribahan',
      name: 'Alhamra AC Economy 05',
      registrationNumber: 'ALH-AC-005',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.ECONOMY,
    },

    // Hanif (4)
    {
      operatorSlug: 'hanif-enterprise',
      name: 'Hanif AC Business 01',
      registrationNumber: 'HNF-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      operatorSlug: 'hanif-enterprise',
      name: 'Hanif AC Economy 02',
      registrationNumber: 'HNF-AC-002',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.ECONOMY,
    },
    {
      operatorSlug: 'hanif-enterprise',
      name: 'Hanif Non-AC 03',
      registrationNumber: 'HNF-NA-003',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      operatorSlug: 'hanif-enterprise',
      name: 'Hanif Sleeper 04',
      registrationNumber: 'HNF-SL-004',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.BUSINESS,
    },
  ];

  for (const bus of busesToEnsure) {
    const operatorId = operatorBySlug.get(bus.operatorSlug)!.id;
    const operatorAdminId =
      operatorAdmins.find((u) => u.operatorId === operatorId)?.id ?? adminUser.id;

    const savedBus = await prisma.bus.upsert({
      where: { registrationNumber: bus.registrationNumber },
      update: {
        name: bus.name,
        operatorId,
        seatCapacity: bus.seatCapacity,
        busType: bus.busType,
        busClass: bus.busClass,
        status: BusStatus.ACTIVE,
        updatedById: operatorAdminId,
      },
      create: {
        name: bus.name,
        operatorId,
        registrationNumber: bus.registrationNumber,
        seatCapacity: bus.seatCapacity,
        busType: bus.busType,
        busClass: bus.busClass,
        status: BusStatus.ACTIVE,
        createdById: operatorAdminId,
        updatedById: operatorAdminId,
      },
      select: { id: true, seatCapacity: true, busType: true, busClass: true },
    });

    await prisma.seat.createMany({
      data: buildSeats(
        savedBus.id,
        savedBus.seatCapacity,
        savedBus.busType,
        savedBus.busClass,
      ),
      skipDuplicates: true,
    });
  }

  // ===== Trips (upcoming, date-based) =====
  const operatorIds = operators.map((o) => operatorBySlug.get(o.slug)!.id);
  const allRoutes = await prisma.route.findMany({
    where: { operatorId: { in: operatorIds } },
    select: { id: true, origin: true, destination: true, operatorId: true },
  });
  const allBuses = await prisma.bus.findMany({
    where: { operatorId: { in: operatorIds }, status: BusStatus.ACTIVE },
    select: { id: true, operatorId: true, busType: true, busClass: true },
  });

  const upcomingDays = 12; // future only
  const departureSlots: Array<{ hour: number; minute: number; durationHours: number }> =
    [
      { hour: 7, minute: 30, durationHours: 6 },
      { hour: 10, minute: 0, durationHours: 7 },
      { hour: 22, minute: 0, durationHours: 8 },
    ];

  const baseDate = startOfDay(addDays(new Date(), 1));
  const tripsToCreate: Prisma.TripCreateManyInput[] = [];

  for (let dayOffset = 0; dayOffset < upcomingDays; dayOffset += 1) {
    const day = addDays(baseDate, dayOffset);
    for (const route of allRoutes) {
      const busesForOperator = allBuses.filter((b) => b.operatorId === route.operatorId);
      if (busesForOperator.length === 0) continue;
      const bus =
        busesForOperator[(dayOffset + hashString(route.id)) % busesForOperator.length];

      for (const slot of departureSlots) {
        // Keep it realistic: seed 1-2 slots per route/day (deterministic)
        if (hashString(`${route.id}:${slot.hour}:${dayOffset}`) % 3 === 0) continue;

        const departureTime = new Date(day);
        departureTime.setHours(slot.hour, slot.minute, 0, 0);
        const arrivalTime = new Date(departureTime);
        arrivalTime.setHours(arrivalTime.getHours() + slot.durationHours);
        const price = getTicketPrice(bus.busType, bus.busClass, route.origin, route.destination);

        const createdById =
          operatorAdmins.find((u) => u.operatorId === route.operatorId)?.id ?? adminUser.id;

        tripsToCreate.push({
          routeId: route.id,
          busId: bus.id,
          operatorId: route.operatorId,
          boardingPoint: route.origin,
          droppingPoint: route.destination,
          departureTime,
          arrivalTime,
          price: price.toFixed(2),
          status: TripStatus.SCHEDULED,
          createdById,
          updatedById: createdById,
        });
      }
    }
  }

  const tripResult = await prisma.trip.createMany({
    data: tripsToCreate,
    skipDuplicates: true,
  });

  // ===== Bookings + seats + payments + refunds =====
  const seededTrips = await prisma.trip.findMany({
    where: { operatorId: { in: operatorIds }, departureTime: { gte: baseDate } },
    orderBy: { departureTime: 'asc' },
    select: { id: true, operatorId: true, busId: true, departureTime: true, price: true },
    take: 40,
  });

  const seats = await prisma.seat.findMany({
    where: { busId: { in: seededTrips.map((t) => t.busId) } },
    select: { id: true, busId: true, seatNumber: true },
  });
  const seatsForBus = new Map<string, Array<{ id: string; seatNumber: string }>>();
  for (const s of seats) {
    const list = seatsForBus.get(s.busId) ?? [];
    list.push({ id: s.id, seatNumber: s.seatNumber });
    seatsForBus.set(s.busId, list);
  }
  for (const [busId, list] of seatsForBus.entries()) {
    list.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
    seatsForBus.set(busId, list);
  }

  const bookingsToSeed = 16; // 10-20
  const paymentWindowMinutes = 2;
  const now = new Date();

  let seededBookings = 0;
  let seededPayments = 0;
  let seededRefunds = 0;

  for (let i = 0; i < bookingsToSeed; i += 1) {
    const trip = seededTrips[i % seededTrips.length];
    const passenger = passengers[(i + 1) % passengers.length];
    const busSeats = seatsForBus.get(trip.busId) ?? [];
    if (busSeats.length < 2) continue;

    const seatCount = 1 + (i % 2); // 1-2 seats
    const seatStart =
      hashString(`${trip.id}:${passenger.id}:${i}`) % (busSeats.length - seatCount);
    const selectedSeats = busSeats.slice(seatStart, seatStart + seatCount);

    const status = pickBookingStatus(i);
    const totalAmount = new Prisma.Decimal(trip.price).mul(seatCount);

    const bookingReference = buildBookingReference(trip.departureTime, i + 1);
    const paymentExpiresAt =
      status === BookingStatus.PENDING
        ? new Date(now.getTime() + paymentWindowMinutes * 60 * 1000)
        : null;

    const createdById =
      operatorAdmins.find((u) => u.operatorId === trip.operatorId)?.id ?? adminUser.id;

    const booking = await prisma.booking.upsert({
      where: { bookingReference },
      update: {
        userId: passenger.id,
        tripId: trip.id,
        operatorId: trip.operatorId,
        passengerName: passenger.fullName,
        passengerPhone: '+8801700002000',
        totalAmount,
        status,
        paymentExpiresAt: paymentExpiresAt ?? undefined,
        updatedById: createdById,
      },
      create: {
        bookingReference,
        userId: passenger.id,
        tripId: trip.id,
        operatorId: trip.operatorId,
        passengerName: passenger.fullName,
        passengerPhone: '+8801700002000',
        totalAmount,
        status,
        paymentExpiresAt: paymentExpiresAt ?? undefined,
        createdById,
        updatedById: createdById,
      },
      select: { id: true, status: true, operatorId: true, userId: true, totalAmount: true },
    });

    for (const seat of selectedSeats) {
      const bookingSeatStatus = toBookingSeatStatus(status);
      const lockExpiresAt =
        bookingSeatStatus === BookingSeatStatus.LOCKED
          ? new Date(now.getTime() + paymentWindowMinutes * 60 * 1000)
          : null;

      const existing = await prisma.bookingSeat.findUnique({
        where: { tripId_seatId: { tripId: trip.id, seatId: seat.id } },
        select: { id: true },
      });

      if (existing) {
        await prisma.bookingSeat.update({
          where: { id: existing.id },
          data: {
            bookingId: booking.id,
            price: trip.price,
            status: bookingSeatStatus,
            lockExpiresAt: lockExpiresAt ?? undefined,
            lockedByUserId: bookingSeatStatus === BookingSeatStatus.LOCKED ? passenger.id : null,
          },
        });
      } else {
        await prisma.bookingSeat.create({
          data: {
            bookingId: booking.id,
            tripId: trip.id,
            seatId: seat.id,
            price: trip.price,
            status: bookingSeatStatus,
            lockExpiresAt: lockExpiresAt ?? undefined,
            lockedByUserId: bookingSeatStatus === BookingSeatStatus.LOCKED ? passenger.id : null,
          },
        });
      }
    }

    const paymentStatus = pickPaymentStatusForBooking(status, i);
    if (paymentStatus) {
      const transactionId = `DEMO-TXN-${formatDateCompact(trip.departureTime)}-${String(i + 1).padStart(4, '0')}`;
      const payment = await prisma.payment.upsert({
        where: { transactionId },
        update: {
          bookingId: booking.id,
          userId: passenger.id,
          operatorId: trip.operatorId,
          amount: booking.totalAmount,
          method: pickPaymentMethod(i),
          status: paymentStatus,
          updatedById: createdById,
        },
        create: {
          bookingId: booking.id,
          userId: passenger.id,
          operatorId: trip.operatorId,
          amount: booking.totalAmount,
          method: pickPaymentMethod(i),
          status: paymentStatus,
          transactionId,
          valId:
            paymentStatus === PaymentStatus.SUCCESS || paymentStatus === PaymentStatus.REFUNDED
              ? `VAL-${transactionId}`
              : null,
          bankTranId:
            paymentStatus === PaymentStatus.SUCCESS || paymentStatus === PaymentStatus.REFUNDED
              ? `BANK-${transactionId}`
              : null,
          createdById,
          updatedById: createdById,
        },
        select: { id: true, status: true },
      });
      seededPayments += 1;

      if (paymentStatus === PaymentStatus.REFUNDED) {
        const refundTransId = `DEMO-RFD-${formatDateCompact(trip.departureTime)}-${String(i + 1).padStart(4, '0')}`;
        await prisma.refund.upsert({
          where: { refundTransId },
          update: {
            bookingId: booking.id,
            paymentId: payment.id,
            userId: passenger.id,
            operatorId: trip.operatorId,
            reason: 'Demo refund for presentation',
            amount: booking.totalAmount.mul(0.5),
            status: RefundStatus.APPROVED,
            processedAt: new Date(),
            processedBy: adminUser.id,
            adminNote: 'Seeded demo refund',
            updatedById: adminUser.id,
          },
          create: {
            bookingId: booking.id,
            paymentId: payment.id,
            userId: passenger.id,
            operatorId: trip.operatorId,
            reason: 'Demo refund for presentation',
            amount: booking.totalAmount.mul(0.5),
            status: RefundStatus.APPROVED,
            processedAt: new Date(),
            processedBy: adminUser.id,
            adminNote: 'Seeded demo refund',
            refundTransId,
            createdById: adminUser.id,
            updatedById: adminUser.id,
          },
        });
        seededRefunds += 1;

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            refundAmount: booking.totalAmount.mul(0.5),
            refundStatus: 'APPROVED',
          },
        });
      }
    }

    seededBookings += 1;
  }

  console.log(`Seed complete:
  - Operators: ${operators.length}
  - Admin: ${adminEmail} / ${adminPassword}
  - Operator admins: ${operatorAdmins.length} (password: ${commonPassword})
  - Staff: ${staffEmails.length} (password: ${commonPassword})
  - Passengers: ${passengers.length} (password: ${commonPassword})
  - Trips created this run: ${tripResult.count}
  - Bookings ensured: ${seededBookings}
  - Payments ensured: ${seededPayments}
  - Refunds ensured: ${seededRefunds}
  `);
}

function buildSeats(
  busId: string,
  seatCapacity: number,
  busType: BusType,
  busClass: BusClass,
) {
  if (busType === BusType.SLEEPER) {
    const deckRows = 6;
    const seatsPerDeckRow = 3;
    const seatsPerDeck = deckRows * seatsPerDeckRow;
    const effectiveCapacity = seatCapacity === 36 ? 36 : 36;

    return Array.from({ length: effectiveCapacity }, (_, index) => {
      const isUpperDeck = index < seatsPerDeck;
      const seatIndex = isUpperDeck ? index : index - seatsPerDeck;
      const rowInDeck = Math.floor(seatIndex / seatsPerDeckRow) + 1;
      const columnInDeck = (seatIndex % seatsPerDeckRow) + 1;
      const deckPrefix = isUpperDeck ? 'U' : 'L';
      return {
        busId,
        seatNumber: formatSleeperSeatNumber(
          deckPrefix as 'U' | 'L',
          rowInDeck,
          columnInDeck,
        ),
        rowNumber: rowInDeck + (isUpperDeck ? 0 : deckRows),
        columnNumber: columnInDeck + (isUpperDeck ? 0 : seatsPerDeckRow),
      };
    });
  }

  const columnsPerRow = busClass === BusClass.BUSINESS ? 3 : 4;
  const totalSeats = seatCapacity;

  return Array.from({ length: totalSeats }, (_, index) => {
    const rowNumber = Math.floor(index / columnsPerRow) + 1;
    const columnNumber = (index % columnsPerRow) + 1;
    return {
      busId,
      seatNumber: formatPassengerSeatNumber(rowNumber, columnNumber),
      rowNumber,
      columnNumber,
    };
  });
}

function getTicketPrice(busType: BusType, busClass: BusClass, origin: string, destination: string): number {
  const isLongRoute = origin.includes("Cox's") || destination.includes("Cox's");
  if (busType === BusType.SLEEPER) return isLongRoute ? 1700 : 1500;
  if (busType === BusType.NON_AC) return isLongRoute ? 950 : 750;
  if (busType === BusType.AC && busClass === BusClass.BUSINESS) return isLongRoute ? 1400 : 1100;
  if (busType === BusType.AC && busClass === BusClass.ECONOMY) return isLongRoute ? 1200 : 900;
  return 900;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function formatDateCompact(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function buildBookingReference(departure: Date, index: number) {
  return `DEMO-${formatDateCompact(departure)}-${String(index).padStart(4, '0')}`;
}

function pickBookingStatus(i: number): BookingStatus {
  const mod = i % 8;
  if (mod === 0) return BookingStatus.CANCELLED;
  if (mod === 1) return BookingStatus.EXPIRED;
  if (mod === 2 || mod === 3) return BookingStatus.PENDING;
  return BookingStatus.CONFIRMED;
}

function toBookingSeatStatus(bookingStatus: BookingStatus): BookingSeatStatus {
  if (bookingStatus === BookingStatus.CONFIRMED) return BookingSeatStatus.RESERVED;
  if (bookingStatus === BookingStatus.CANCELLED) return BookingSeatStatus.CANCELLED;
  return BookingSeatStatus.LOCKED;
}

function pickPaymentMethod(i: number): PaymentMethod {
  const methods = [PaymentMethod.BKASH, PaymentMethod.NAGAD, PaymentMethod.CARD] as const;
  return methods[i % methods.length];
}

function pickPaymentStatusForBooking(bookingStatus: BookingStatus, i: number): PaymentStatus | null {
  if (bookingStatus === BookingStatus.PENDING) return PaymentStatus.PENDING;
  if (bookingStatus === BookingStatus.EXPIRED) return PaymentStatus.FAILED;
  if (bookingStatus === BookingStatus.CANCELLED) return null;
  return i % 7 === 0 ? PaymentStatus.REFUNDED : PaymentStatus.SUCCESS;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
