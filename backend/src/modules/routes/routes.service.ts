import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Route } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteSeederService } from './route-seeder.service';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly routeSeederService: RouteSeederService,
  ) {}

  async create(
    createRouteDto: CreateRouteDto,
    operatorId: string,
  ): Promise<Route> {
    try {
      const route = await this.prismaService.route.create({
        data: { ...createRouteDto, operatorId },
      });
      await this.routeSeederService.ensureReverseRoute(
        createRouteDto.origin,
        createRouteDto.destination,
        operatorId,
      );
      return route;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Route already exists for this origin and destination',
        );
      }
      throw error;
    }
  }

  async findByOperator(operatorId: string): Promise<Route[]> {
    return this.prismaService.route.findMany({
      where: { operatorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(): Promise<Route[]> {
    return this.prismaService.route.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneById(id: string): Promise<Route> {
    const route = await this.prismaService.route.findUnique({
      where: { id },
    });

    if (!route) {
      throw new NotFoundException(`Route not found for id: ${id}`);
    }

    return route;
  }

  async update(id: string, updateRouteDto: UpdateRouteDto): Promise<Route> {
    await this.findOneById(id);
    try {
      return await this.prismaService.route.update({
        where: { id },
        data: updateRouteDto,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Route already exists for this origin and destination',
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Route> {
    await this.findOneById(id);
    try {
      return await this.prismaService.route.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Route cannot be deleted because it is used in trips',
        );
      }
      throw error;
    }
  }
}
