import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OperatorStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';

@Injectable()
export class OperatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOperatorDto) {
    const existing = await this.prisma.operator.findFirst({
      where: {
        OR: [{ companyName: dto.companyName }, { slug: dto.slug }],
      },
    });
    if (existing) {
      throw new ConflictException(
        'Operator with this name or slug already exists',
      );
    }

    const operator = await this.prisma.operator.create({
      data: {
        companyName: dto.companyName,
        slug: dto.slug,
        logo: dto.logo,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        description: dto.description,
      },
    });

    if (dto.adminEmail && dto.adminPassword && dto.adminName) {
      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      await this.prisma.user.create({
        data: {
          fullName: dto.adminName,
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          role: 'OPERATOR',
          operatorId: operator.id,
        },
      });
    }

    return operator;
  }

  async findAll() {
    return this.prisma.operator.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            buses: true,
            trips: true,
            bookings: true,
          },
        },
      },
    });
    if (!operator) {
      throw new NotFoundException('Operator not found');
    }
    return operator;
  }

  async findBySlug(slug: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { slug },
    });
    if (!operator) {
      throw new NotFoundException('Operator not found');
    }
    return operator;
  }

  async update(id: string, dto: UpdateOperatorDto) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
    });
    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    if (dto.companyName || dto.slug) {
      const existing = await this.prisma.operator.findFirst({
        where: {
          OR: [
            ...(dto.companyName ? [{ companyName: dto.companyName }] : []),
            ...(dto.slug ? [{ slug: dto.slug }] : []),
          ],
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException('Company name or slug already taken');
      }
    }

    return this.prisma.operator.update({
      where: { id },
      data: dto,
    });
  }

  async suspend(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const operator = await tx.operator.findUnique({ where: { id } });
      if (!operator) throw new NotFoundException('Operator not found');

      await tx.operator.update({
        where: { id },
        data: { status: OperatorStatus.SUSPENDED },
      });

      return { message: 'Operator suspended successfully' };
    });
  }

  async activate(id: string) {
    const operator = await this.prisma.operator.findUnique({ where: { id } });
    if (!operator) throw new NotFoundException('Operator not found');

    return this.prisma.operator.update({
      where: { id },
      data: { status: OperatorStatus.ACTIVE },
    });
  }

  async findStaff(operatorId: string) {
    return this.prisma.user.findMany({
      where: { operatorId, role: 'STAFF' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(
    operatorId: string,
    dto: {
      fullName: string;
      email: string;
      password: string;
      phoneNumber?: string;
    },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        passwordHash,
        phoneNumber: dto.phoneNumber,
        role: 'STAFF',
        operatorId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
    });
  }

  async updateStaff(
    id: string,
    dto: {
      fullName?: string;
      email?: string;
      password?: string;
      phoneNumber?: string;
    },
    operatorId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'STAFF')
      throw new NotFoundException('Staff user not found');

    if (operatorId && user.operatorId !== operatorId) {
      throw new ForbiddenException('Staff does not belong to your operator');
    }

    const data: any = {};
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.email) data.email = dto.email.toLowerCase();
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
    });
  }

  async deleteStaff(id: string, operatorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'STAFF')
      throw new NotFoundException('Staff user not found');

    if (operatorId && user.operatorId !== operatorId) {
      throw new ForbiddenException('Staff does not belong to your operator');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Staff user deleted' };
  }

  async countBookings(operatorId: string): Promise<number> {
    return this.prisma.booking.count({ where: { operatorId } });
  }

  async getStats(id: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            buses: true,
            trips: true,
            bookings: { where: { status: 'CONFIRMED' } },
            users: { where: { role: 'STAFF' } },
          },
        },
      },
    });
    if (!operator) throw new NotFoundException('Operator not found');

    const revenue = await this.prisma.payment.aggregate({
      where: {
        operatorId: id,
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });

    const refunds = await this.prisma.refund.count({
      where: { operatorId: id, status: 'PENDING' },
    });

    return {
      totalBuses: operator._count.buses,
      totalTrips: operator._count.trips,
      totalBookings: operator._count.bookings,
      totalStaff: operator._count.users,
      totalRevenue: Number(revenue._sum.amount ?? 0),
      pendingRefunds: refunds,
    };
  }
}
