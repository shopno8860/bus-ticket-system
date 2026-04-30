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
      name: 'Alhamra Non-AC Coach 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Alhamra Sleeper 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
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
      name: 'Orin Non-AC Coach 1',
      operatorName: 'Orin',
      registrationNumber: 'OR-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Orin Sleeper 1',
      operatorName: 'Orin',
      registrationNumber: 'OR-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'SR AC Coach 1',
      operatorName: 'SR',
      registrationNumber: 'SR-AC-001',
      seatCapacity: 32,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'SR Non-AC Coach 1',
      operatorName: 'SR',
      registrationNumber: 'SR-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'SR Sleeper 1',
      operatorName: 'SR',
      registrationNumber: 'SR-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Nabil AC Coach 1',
      operatorName: 'Nabil',
      registrationNumber: 'NB-AC-001',
      seatCapacity: 32,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Nabil Non-AC Coach 1',
      operatorName: 'Nabil',
      registrationNumber: 'NB-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Nabil Sleeper 1',
      operatorName: 'Nabil',
      registrationNumber: 'NB-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
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
      name: 'Hanif Non-AC Coach 1',
      operatorName: 'Hanif',
      registrationNumber: 'HN-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Hanif Sleeper 1',
      operatorName: 'Hanif',
      registrationNumber: 'HN-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Green Line AC Coach 1',
      operatorName: 'Green Line',
      registrationNumber: 'GL-AC-001',
      seatCapacity: 32,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Green Line Non-AC Coach 1',
      operatorName: 'Green Line',
      registrationNumber: 'GL-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Green Line Sleeper 1',
      operatorName: 'Green Line',
      registrationNumber: 'GL-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Akota AC Coach 1',
      operatorName: 'Akota',
      registrationNumber: 'AK-AC-001',
      seatCapacity: 32,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Akota Non-AC Coach 1',
      operatorName: 'Akota',
      registrationNumber: 'AK-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Akota Sleeper 1',
      operatorName: 'Akota',
      registrationNumber: 'AK-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.ECONOMY,
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
