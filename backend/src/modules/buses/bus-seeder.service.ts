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
      name: 'Green Line Coach 1',
      operatorName: 'Green Line',
      registrationNumber: 'GL-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Green Line Coach 2',
      operatorName: 'Green Line',
      registrationNumber: 'GL-AC-002',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Alhamra Paribahan 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-AC-001',
      seatCapacity: 40,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Orin Travels 1',
      operatorName: 'Orin',
      registrationNumber: 'OR-NA-001',
      seatCapacity: 36,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'SR Travels 1',
      operatorName: 'SR',
      registrationNumber: 'SR-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
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
      name: 'Hanif Express 2',
      operatorName: 'Hanif',
      registrationNumber: 'HN-NA-002',
      seatCapacity: 36,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Nabil Paribahan 1',
      operatorName: 'Nabil',
      registrationNumber: 'NB-AC-001',
      seatCapacity: 36,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Nabil Paribahan 2',
      operatorName: 'Nabil',
      registrationNumber: 'NB-NA-002',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Akota Travels 1',
      operatorName: 'Akota',
      registrationNumber: 'AK-NA-001',
      seatCapacity: 38,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Akota Travels 2',
      operatorName: 'Akota',
      registrationNumber: 'AK-AC-002',
      seatCapacity: 32,
      busType: BusType.AC,
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
