import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Cleaning old data...");

  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.route.deleteMany();

  console.log("✅ Old data deleted");

  //////////////////////////////////////////////////////
  // 🚌 MULTIPLE BUS
  //////////////////////////////////////////////////////
  const buses = await Promise.all([
    prisma.bus.create({
      data: {
        name: "Green Line",
        operatorName: "Green Line",
        registrationNumber: "BUS-101",
        seatCapacity: 40,
        busType: "AC"
      }
    }),
    prisma.bus.create({
      data: {
        name: "Hanif",
        operatorName: "Hanif Enterprise",
        registrationNumber: "BUS-102",
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
  // 🛣 ROUTES
  //////////////////////////////////////////////////////
  const routes = await Promise.all([
    prisma.route.create({ data: { origin: "Dhaka", destination: "Chittagong" } }),
    prisma.route.create({ data: { origin: "Chittagong", destination: "Dhaka" } }),
    prisma.route.create({ data: { origin: "Dhaka", destination: "Sylhet" } }),
    prisma.route.create({ data: { origin: "Sylhet", destination: "Dhaka" } }),
  ]);

  //////////////////////////////////////////////////////
  // 🧳 MANY TRIPS (🔥 MAIN PART)
  //////////////////////////////////////////////////////
  const trips: Promise<any>[] = [];

  let hourOffset = 0;

  for (let i = 0; i < 25; i++) {
    const route = routes[i % routes.length];
    const bus = buses[i % buses.length];

    trips.push(
      prisma.trip.create({
        data: {
          busId: bus.id,
          routeId: route.id,
          departureTime: new Date(Date.now() + hourOffset * 60 * 60 * 1000),
          arrivalTime: new Date(Date.now() + (hourOffset + 6) * 60 * 60 * 1000),
          price: 700 + (i % 5) * 100
        }
      })
    );

    hourOffset += 2; // every 2 hour gap
  }

  await Promise.all(trips);

  console.log("🔥 MANY TRIPS SEEDED (25+)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());