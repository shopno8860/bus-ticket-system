import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UserResponse = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll(): Promise<UserResponse[]> {
    return this.prismaService.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOneById(id: string): Promise<UserResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User not found for id: ${id}`);
    }

    return user;
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    await this.findCurrentUser(userId);

    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        fullName: updateUserDto.fullName,
        phoneNumber: updateUserDto.phoneNumber,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changeUserRole(
    targetUserId: string,
    actorUserId: string,
    dto: ChangeUserRoleDto,
  ): Promise<UserResponse> {
    const targetUser = await this.findOneById(targetUserId);

    if (targetUser.id === actorUserId && dto.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot remove your own admin access');
    }

    return this.prismaService.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalBookings: number;
    totalRevenue: string;
  }> {
    const [totalUsers, totalBookings, paymentAggregate] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.booking.count(),
      this.prismaService.payment.aggregate({
        where: { status: { in: ['SUCCESS', 'REFUNDED'] } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      totalBookings,
      totalRevenue: paymentAggregate._sum.amount
        ? paymentAggregate._sum.amount.toString()
        : '0',
    };
  }
}
