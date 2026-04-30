import { Injectable, Logger } from '@nestjs/common';
import { BusClass, BusType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SeatsService } from '../seats/seats.service';

type SeedBus = {
  name: string;
  operatorName: string;
  registrationNumber: string;
  seatCapacity: number;
  busType: BusType;
  busClass: BusClass;
};

@Injectable()
export class BusSeederService {
  private readonly logger = new Logger(BusSeederService.name);

  private readonly buses: SeedBus[] = [
    {
      name: 'Alhamra AC Coach 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-AC-001',
      seatCapacity: 32,
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
      seatCapacity: 32,
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
      seatCapacity: 32,
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
  ];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly seatsService: SeatsService,
  ) {}

  async seedBuses(): Promise<number> {
    let createdBuses = 0;

    for (const bus of this.buses) {
      const existing = await this.prismaService.bus.findUnique({
        where: { registrationNumber: bus.registrationNumber },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const created = await this.prismaService.bus.create({ data: bus });
      await this.seatsService.createForBus(created.id, {
        forceRegenerate: false,
      });
      createdBuses += 1;
      this.logger.log(
        `Created bus: ${created.operatorName} (${created.busType}) [${created.registrationNumber}]`,
      );
    }

    return createdBuses;
  }
}
