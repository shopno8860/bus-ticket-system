import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {

  console.log("🧹 Cleaning old data...");

  //////////////////////////////////////////////////////
  // 🗑️ DELETE ORDER (IMPORTANT - relation wise)
  //////////////////////////////////////////////////////
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.route.deleteMany(); // 🔥 route delete hobe ekhane
  await prisma.user.deleteMany();

  console.log("✅ Old data deleted");

  //////////////////////////////////////////////////////
  // 👤 USERS
  //////////////////////////////////////////////////////
  const users = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.user.create({
        data: {
          fullName: i === 0 ? "Admin User" : `User ${i}`,
          email: i === 0 ? "admin@gmail.com" : `user${i}@gmail.com`,
          passwordHash: "123456",
          phoneNumber: `0170000000${i}`,
          role: i === 0 ? "ADMIN" : "USER"
        }
      })
    )
  );

  //////////////////////////////////////////////////////
  // 🚌 BUSES
  //////////////////////////////////////////////////////
  const buses = await Promise.all([
    prisma.bus.create({
      data: {
        name: "Green Line",
        operatorName: "Green Line Paribahan",
        registrationNumber: "BUS-111",
        seatCapacity: 40,
        busType: "AC"
      }
    }),
    prisma.bus.create({
      data: {
        name: "Hanif",
        operatorName: "Hanif Enterprise",
        registrationNumber: "BUS-222",
        seatCapacity: 36,
        busType: "NON_AC"
      }
    })
  ]);

  //////////////////////////////////////////////////////
  // 💺 SEATS
  //////////////////////////////////////////////////////
  for (const bus of buses) {
    const seats: any[] = [];
    for (let i = 1; i <= bus.seatCapacity; i++) {
      seats.push({
        busId: bus.id,
        seatNumber: `S${i}`,
        rowNumber: Math.ceil(i / 4),
        columnNumber: (i % 4) || 4
      });
    }
    await prisma.seat.createMany({ data: seats });
  }

  //////////////////////////////////////////////////////
  // 🛣 ROUTES (NEW)
  //////////////////////////////////////////////////////
  const routes = await Promise.all([
    prisma.route.create({ data: { origin: "Dhaka", destination: "Chittagong" } }),
    prisma.route.create({ data: { origin: "Dhaka", destination: "Sylhet" } }),
    prisma.route.create({ data: { origin: "Dhaka", destination: "Khulna" } })
  ]);

  //////////////////////////////////////////////////////
  // 🧳 TRIPS
  //////////////////////////////////////////////////////
  const trips: any[] = [];

  for (let i = 0; i < 5; i++) {
    const trip = await prisma.trip.create({
      data: {
        busId: randomItem(buses).id,
        routeId: randomItem(routes).id,
        departureTime: new Date(Date.now() + i * 2 * 60 * 60 * 1000),
        arrivalTime: new Date(Date.now() + (i + 5) * 60 * 60 * 1000),
        price: 500 + i * 100
      }
    });

    trips.push(trip);
  }

  //////////////////////////////////////////////////////
  // 🎫 BOOKINGS + PAYMENT + REFUND
  //////////////////////////////////////////////////////
  for (let i = 0; i < 15; i++) {

    const user = randomItem(users);
    const trip = randomItem(trips);

    const booking = await prisma.booking.create({
      data: {
        bookingReference: `BOOK-${i}-${Date.now()}`,
        userId: user.id,
        tripId: trip.id,
        passengerName: user.fullName,
        passengerPhone: user.phoneNumber || "01700000000",
        totalAmount: 800,
        status: "CONFIRMED"
      }
    });

    // SAFE seat select
    const availableSeat = await prisma.seat.findFirst({
      where: {
        busId: trip.busId,
        bookingSeats: {
          none: {
            tripId: trip.id
          }
        }
      }
    });

    if (availableSeat) {
      await prisma.bookingSeat.create({
        data: {
          bookingId: booking.id,
          tripId: trip.id,
          seatId: availableSeat.id,
          price: 800,
          status: "RESERVED"
        }
      });
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        amount: 800,
        method: randomItem(["BKASH", "NAGAD", "CARD"]),
        status: "SUCCESS",
        transactionId: `TXN-${i}-${Date.now()}`
      }
    });

    if (i % 4 === 0) {
      await prisma.refund.create({
        data: {
          bookingId: booking.id,
          paymentId: payment.id,
          userId: user.id,
          reason: "Partial refund",
          amount: 200,
          status: "APPROVED"
        }
      });
    }
  }

  console.log("🔥 FULL RESET + SEED DONE!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
