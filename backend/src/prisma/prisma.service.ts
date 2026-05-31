// import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { PrismaPg } from '@prisma/adapter-pg';
// import { PrismaClient } from '@prisma/client';
// import { Pool } from 'pg';

// /** Application-wide Prisma client with pg adapter; connects on init and disconnects on destroy. */
// @Injectable()
// export class PrismaService
//   extends PrismaClient
//   implements OnModuleInit, OnModuleDestroy
// {
//   constructor(configService: ConfigService) {
//     const connectionString = configService.getOrThrow<string>('DATABASE_URL');

//     const url = new URL(connectionString);
//     url.searchParams.delete('sslmode');
//     const cleanConnectionString = url.toString();

//     const pool = new Pool({
//       connectionString: cleanConnectionString,
//       ssl: { rejectUnauthorized: false },
//       max: 10,
//       connectionTimeoutMillis: 10000,
//       idleTimeoutMillis: 30000,
//     });

//     super({
//       adapter: new PrismaPg(pool),
//     });
//   }

//   async onModuleInit() {
//     await this.$connect();
//   }

//   async onModuleDestroy() {
//     await this.$disconnect();
//   }
// }

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/** Application-wide Prisma client with pg adapter; connects on init and disconnects on destroy. */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');

    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');

    const cleanConnectionString = url.toString();

    // Localhost হলে SSL off, Online DB হলে SSL on
    const isLocalDatabase =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    const pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });

    super({
      adapter: new PrismaPg(pool),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
