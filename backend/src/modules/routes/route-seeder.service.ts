import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RouteSeederService {
  private readonly logger = new Logger(RouteSeederService.name);

  private readonly bangladeshCities = [
    'Gaibandha',
    'Rangpur',
    'Bogra',
    'Chittagong',
    'Sylhet',
    "Cox's Bazar",
  ] as const;

  constructor(private readonly prismaService: PrismaService) {}

  async seedRoutes(): Promise<number> {
    let createdRoutes = 0;

    for (const city of this.bangladeshCities) {
      const direct = await this.prismaService.route.createMany({
        data: { origin: 'Dhaka', destination: city },
        skipDuplicates: true,
      });
      if (direct.count > 0) {
        createdRoutes += direct.count;
        this.logger.log(`Created route: Dhaka -> ${city}`);
      }

      const reverse = await this.prismaService.route.createMany({
        data: { origin: city, destination: 'Dhaka' },
        skipDuplicates: true,
      });
      if (reverse.count > 0) {
        createdRoutes += reverse.count;
        this.logger.log(`Created route: ${city} -> Dhaka`);
      }
    }

    return createdRoutes;
  }

  async ensureReverseRoute(
    origin: string,
    destination: string,
  ): Promise<boolean> {
    if (origin === destination) {
      return false;
    }

    const created = await this.prismaService.route.createMany({
      data: { origin: destination, destination: origin },
      skipDuplicates: true,
    });

    if (created.count > 0) {
      this.logger.log(`Created reverse route: ${destination} -> ${origin}`);
      return true;
    }

    return false;
  }
}
