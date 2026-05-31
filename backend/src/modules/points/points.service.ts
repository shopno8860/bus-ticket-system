import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BoardingPoint, DroppingPoint, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBoardingPointDto } from './dto/create-boarding-point.dto';
import { CreateDroppingPointDto } from './dto/create-dropping-point.dto';
import { UpdateBoardingPointDto } from './dto/update-boarding-point.dto';
import { UpdateDroppingPointDto } from './dto/update-dropping-point.dto';

@Injectable()
export class PointsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listForRoute(routeId: string, onlyActive = true) {
    const route = await this.prismaService.route.findUnique({
      where: { id: routeId },
      select: { id: true },
    });
    if (!route) {
      throw new NotFoundException(`Route not found for id: ${routeId}`);
    }
    const whereBase = {
      routeId,
      ...(onlyActive ? { isActive: true } : {}),
    };
    const [boardingPoints, droppingPoints] = await Promise.all([
      this.prismaService.boardingPoint.findMany({
        where: whereBase,
        orderBy: { name: 'asc' },
      }),
      this.prismaService.droppingPoint.findMany({
        where: whereBase,
        orderBy: { name: 'asc' },
      }),
    ]);
    return { boardingPoints, droppingPoints };
  }

  async createBoardingPoint(dto: CreateBoardingPointDto, operatorId: string): Promise<BoardingPoint> {
    const route = await this.prismaService.route.findUnique({
      where: { id: dto.routeId },
      select: { operatorId: true },
    });
    if (!route || route.operatorId !== operatorId) {
      throw new NotFoundException('Route not found for operator');
    }
    try {
      return await this.prismaService.boardingPoint.create({
        data: {
          operatorId,
          routeId: dto.routeId,
          name: dto.name,
          address: dto.address,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Boarding point already exists for this route');
      }
      throw error;
    }
  }

  async updateBoardingPoint(id: string, dto: UpdateBoardingPointDto, operatorId: string) {
    const existing = await this.prismaService.boardingPoint.findUnique({ where: { id } });
    if (!existing || existing.operatorId !== operatorId) {
      throw new NotFoundException('Boarding point not found');
    }
    if (dto.routeId) {
      const route = await this.prismaService.route.findUnique({
        where: { id: dto.routeId },
        select: { operatorId: true },
      });
      if (!route || route.operatorId !== operatorId) {
        throw new NotFoundException('Route not found for operator');
      }
    }
    return this.prismaService.boardingPoint.update({
      where: { id },
      data: dto,
    });
  }

  async deleteBoardingPoint(id: string, operatorId: string) {
    const existing = await this.prismaService.boardingPoint.findUnique({ where: { id } });
    if (!existing || existing.operatorId !== operatorId) {
      throw new NotFoundException('Boarding point not found');
    }
    const bookingCount = await this.prismaService.booking.count({
      where: { boardingPointId: id },
    });
    if (bookingCount > 0) {
      throw new ConflictException(
        'Cannot delete boarding point that is used by existing bookings',
      );
    }
    return this.prismaService.boardingPoint.delete({ where: { id } });
  }

  async createDroppingPoint(dto: CreateDroppingPointDto, operatorId: string): Promise<DroppingPoint> {
    const route = await this.prismaService.route.findUnique({
      where: { id: dto.routeId },
      select: { operatorId: true },
    });
    if (!route || route.operatorId !== operatorId) {
      throw new NotFoundException('Route not found for operator');
    }
    try {
      return await this.prismaService.droppingPoint.create({
        data: {
          operatorId,
          routeId: dto.routeId,
          name: dto.name,
          address: dto.address,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Dropping point already exists for this route');
      }
      throw error;
    }
  }

  async updateDroppingPoint(id: string, dto: UpdateDroppingPointDto, operatorId: string) {
    const existing = await this.prismaService.droppingPoint.findUnique({ where: { id } });
    if (!existing || existing.operatorId !== operatorId) {
      throw new NotFoundException('Dropping point not found');
    }
    if (dto.routeId) {
      const route = await this.prismaService.route.findUnique({
        where: { id: dto.routeId },
        select: { operatorId: true },
      });
      if (!route || route.operatorId !== operatorId) {
        throw new NotFoundException('Route not found for operator');
      }
    }
    return this.prismaService.droppingPoint.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDroppingPoint(id: string, operatorId: string) {
    const existing = await this.prismaService.droppingPoint.findUnique({ where: { id } });
    if (!existing || existing.operatorId !== operatorId) {
      throw new NotFoundException('Dropping point not found');
    }
    const bookingCount = await this.prismaService.booking.count({
      where: { droppingPointId: id },
    });
    if (bookingCount > 0) {
      throw new ConflictException(
        'Cannot delete dropping point that is used by existing bookings',
      );
    }
    return this.prismaService.droppingPoint.delete({ where: { id } });
  }
}
