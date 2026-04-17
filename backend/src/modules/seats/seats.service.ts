import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Seat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSeatsForBusDto } from './dto/create-seats-for-bus.dto';

@Injectable()
export class SeatsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createForBus(
    busId: string,
    createSeatsForBusDto: CreateSeatsForBusDto,
  ): Promise<Seat[]> {
    const bus = await this.prismaService.bus.findUnique({
      where: { id: busId },
      select: { id: true, seatCapacity: true },
    });

    if (!bus) {
      throw new NotFoundException(`Bus not found for id: ${busId}`);
    }

    const existingSeatsCount = await this.prismaService.seat.count({
      where: { busId },
    });

    if (existingSeatsCount > 0) {
      throw new ConflictException('Seats already exist for this bus');
    }

    const columnsPerRow = createSeatsForBusDto.columnsPerRow;
    const seatsData: Prisma.SeatCreateManyInput[] = Array.from(
      { length: bus.seatCapacity },
      (_, index) => {
        const rowNumber = Math.floor(index / columnsPerRow) + 1;
        const columnNumber = (index % columnsPerRow) + 1;

        return {
          busId,
          seatNumber: `R${rowNumber}C${columnNumber}`,
          rowNumber,
          columnNumber,
        };
      },
    );

    try {
      await this.prismaService.seat.createMany({
        data: seatsData,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Duplicate seat number found for this bus');
      }

      throw error;
    }

    return this.findAllByBusId(busId);
  }

  async findAllByBusId(busId: string): Promise<Seat[]> {
    const bus = await this.prismaService.bus.findUnique({
      where: { id: busId },
      select: { id: true },
    });

    if (!bus) {
      throw new NotFoundException(`Bus not found for id: ${busId}`);
    }

    return this.prismaService.seat.findMany({
      where: { busId },
      orderBy: [{ rowNumber: 'asc' }, { columnNumber: 'asc' }],
    });
  }
}
