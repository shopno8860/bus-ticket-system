import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Bus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';

@Injectable()
export class BusesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createBusDto: CreateBusDto): Promise<Bus> {
    try {
      return await this.prismaService.bus.create({
        data: createBusDto,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : undefined;
        if (target?.includes('registrationNumber')) {
          throw new ConflictException('Registration number already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }
      throw error;
    }
  }

  async findAll(): Promise<Bus[]> {
    return this.prismaService.bus.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneById(id: string): Promise<Bus> {
    const bus = await this.prismaService.bus.findUnique({
      where: { id },
    });

    if (!bus) {
      throw new NotFoundException(`Bus not found for id: ${id}`);
    }

    return bus;
  }

  async update(id: string, updateBusDto: UpdateBusDto): Promise<Bus> {
    await this.findOneById(id);

    try {
      return await this.prismaService.bus.update({
        where: { id },
        data: updateBusDto,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Registration number already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Bus> {
    await this.findOneById(id);
    try {
      return await this.prismaService.bus.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Bus cannot be deleted because it is used in trips',
        );
      }
      throw error;
    }
  }
}
