import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingSeatStatus,
  BusClass,
  BusType,
  Prisma,
  Seat,
} from '@prisma/client';
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
      select: { id: true, seatCapacity: true, busClass: true, busType: true },
    });

    if (!bus) {
      throw new NotFoundException(`Bus not found for id: ${busId}`);
    }

    const existingSeatsCount = await this.prismaService.seat.count({
      where: { busId },
    });

    const shouldRegenerate =
      Boolean(createSeatsForBusDto.forceRegenerate) && existingSeatsCount > 0;

    if (existingSeatsCount > 0 && !shouldRegenerate) {
      throw new ConflictException('Seats already exist for this bus');
    }

    if (shouldRegenerate) {
      await this.ensureNoFutureSeatLocksOrReservations(busId);
      await this.prismaService.seat.deleteMany({ where: { busId } });
    }

    const columnsPerRow =
      createSeatsForBusDto.columnsPerRow ??
      this.getDefaultColumnsPerRow(bus.busClass);
    const seatsData = this.buildSeatsData(
      busId,
      bus.seatCapacity,
      bus.busClass,
      bus.busType,
      columnsPerRow,
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

  private getDefaultColumnsPerRow(busClass: BusClass): number {
    return busClass === BusClass.BUSINESS ? 3 : 4;
  }

  private buildSeatsData(
    busId: string,
    seatCapacity: number,
    busClass: BusClass,
    busType: BusType,
    columnsPerRow: number,
  ): Prisma.SeatCreateManyInput[] {
    if (busType === BusType.SLEEPER) {
      return this.buildSleeperSeatsData(busId, 36);
    }

    if (busClass === BusClass.BUSINESS) {
      return this.buildBusinessSeatsData(busId);
    }

    if (columnsPerRow <= 0) {
      throw new BadRequestException('columnsPerRow must be greater than 0');
    }

    return Array.from({ length: seatCapacity }, (_, index) => {
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

  private buildBusinessSeatsData(busId: string): Prisma.SeatCreateManyInput[] {
    const seatsData: Prisma.SeatCreateManyInput[] = [];
    const normalRows = 8;
    const normalRowSeats = 3;
    for (let rowNumber = 1; rowNumber <= normalRows; rowNumber += 1) {
      for (
        let columnNumber = 1;
        columnNumber <= normalRowSeats;
        columnNumber += 1
      ) {
        seatsData.push({
          busId,
          seatNumber: `R${rowNumber}C${columnNumber}`,
          rowNumber,
          columnNumber,
        });
      }
    }

    const lastRowNumber = normalRows + 1;
    for (let columnNumber = 1; columnNumber <= 4; columnNumber += 1) {
      seatsData.push({
        busId,
        seatNumber: `R${lastRowNumber}C${columnNumber}`,
        rowNumber: lastRowNumber,
        columnNumber,
      });
    }

    return seatsData;
  }

  private buildSleeperSeatsData(
    busId: string,
    seatCapacity: number,
  ): Prisma.SeatCreateManyInput[] {
    const deckRows = 6;
    const seatsPerDeckRow = 3;
    const totalUpperSeats = 18;
    const totalLowerSeats = 18;
    const seatsData: Prisma.SeatCreateManyInput[] = [];

    for (let index = 0; index < seatCapacity; index += 1) {
      const isUpperDeck = index < totalUpperSeats;
      const deckOffset = isUpperDeck ? index : index - totalUpperSeats;
      const rowInDeck = Math.floor(deckOffset / seatsPerDeckRow) + 1;
      const columnInDeck = (deckOffset % seatsPerDeckRow) + 1;
      const rowNumber = isUpperDeck ? rowInDeck : deckRows + rowInDeck;
      const columnNumber = isUpperDeck
        ? columnInDeck
        : seatsPerDeckRow + columnInDeck;
      const deckPrefix = isUpperDeck ? 'U' : 'L';
      const seatSequence = String(deckOffset + 1).padStart(2, '0');

      seatsData.push({
        busId,
        seatNumber: `${deckPrefix}${seatSequence}`,
        rowNumber,
        columnNumber,
      });
    }

    if (seatsData.length !== totalUpperSeats + totalLowerSeats) {
      throw new BadRequestException('Invalid sleeper seat configuration');
    }

    return seatsData;
  }

  private async ensureNoFutureSeatLocksOrReservations(
    busId: string,
  ): Promise<void> {
    const now = new Date();
    const activeSeatAllocation = await this.prismaService.bookingSeat.findFirst(
      {
        where: {
          status: {
            in: [BookingSeatStatus.RESERVED, BookingSeatStatus.LOCKED],
          },
          OR: [{ lockExpiresAt: null }, { lockExpiresAt: { gt: now } }],
          trip: {
            busId,
            departureTime: { gt: now },
          },
        },
        select: { id: true },
      },
    );

    if (activeSeatAllocation) {
      throw new BadRequestException(
        'Cannot regenerate seats while future trip seats are locked or reserved',
      );
    }
  }
}
