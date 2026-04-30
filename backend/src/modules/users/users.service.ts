import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, RefundStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type UserResponse = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  address: string | null;
  dateOfBirth: Date | null;
  nationalId: string | null;
  passportNumber: string | null;
  visaInfo: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};
type DashboardTrendPoint = {
  label: string;
  bookings: number;
  revenue: number;
};
type DashboardRecentActivity = {
  user: string;
  action: 'Booked' | 'Cancelled' | 'Refund Requested';
  date: string;
  status: 'Success' | 'Warning' | 'Pending';
};
type DashboardStatsResponse = {
  totalUsers: number;
  totalBuses: number;
  totalTrips: number;
  totalBookings: number;
  totalRevenue: string;
  pendingRefunds: number;
  bookingTrends: DashboardTrendPoint[];
  revenueOverview: DashboardTrendPoint[];
  recentActivity: DashboardRecentActivity[];
};

const userProfileSelect = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  gender: true,
  address: true,
  dateOfBirth: true,
  nationalId: true,
  passportNumber: true,
  visaInfo: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as any;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user as unknown as UserResponse;
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.prismaService.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: userProfileSelect,
    });
    return users as unknown as UserResponse[];
  }

  async findOneById(id: string): Promise<UserResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: userProfileSelect,
    });

    if (!user) {
      throw new NotFoundException(`User not found for id: ${id}`);
    }

    return user as unknown as UserResponse;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponse> {
    await this.findCurrentUser(userId);

    if (updateProfileDto.dateOfBirth) {
      const parsedDate = new Date(updateProfileDto.dateOfBirth);
      const today = new Date();
      parsedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (parsedDate >= today) {
        throw new BadRequestException('dateOfBirth must be a past date');
      }
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        fullName: updateProfileDto.fullName,
        phoneNumber: updateProfileDto.phoneNumber,
        gender: updateProfileDto.gender,
        address: updateProfileDto.address,
        dateOfBirth: updateProfileDto.dateOfBirth
          ? new Date(updateProfileDto.dateOfBirth)
          : null,
        nationalId: updateProfileDto.nationalId,
        passportNumber: updateProfileDto.passportNumber,
        visaInfo: updateProfileDto.visaInfo,
      } as any,
      select: userProfileSelect,
    });
    return updatedUser as unknown as UserResponse;
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

    const updatedUser = await this.prismaService.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: userProfileSelect,
    });
    return updatedUser as unknown as UserResponse;
  }

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const [
      totalUsers,
      totalBuses,
      totalTrips,
      totalBookings,
      pendingRefunds,
      paymentAggregate,
    ] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.bus.count(),
      this.prismaService.trip.count(),
      this.prismaService.booking.count(),
      this.prismaService.refund.count({
        where: { status: RefundStatus.PENDING },
      }),
      this.prismaService.payment.aggregate({
        where: { status: { in: ['SUCCESS', 'REFUNDED'] } },
        _sum: { amount: true },
      }),
    ]);

    const now = new Date();
    const dayKeys: string[] = [];
    const dayLabelMap = new Map<string, string>();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      dayKeys.push(key);
      dayLabelMap.set(
        key,
        date.toLocaleDateString('en-US', { weekday: 'short' }),
      );
    }

    const rangeStart = new Date(now);
    rangeStart.setHours(0, 0, 0, 0);
    rangeStart.setDate(now.getDate() - 6);

    const [recentBookings, recentRefunds] = await Promise.all([
      this.prismaService.booking.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: {
          createdAt: true,
          status: true,
          cancelReason: true,
          user: { select: { fullName: true } },
        },
      }),
      this.prismaService.refund.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: {
          createdAt: true,
          status: true,
          user: { select: { fullName: true } },
        },
      }),
    ]);

    const bookingCounts = new Map<string, number>();
    recentBookings.forEach((booking) => {
      const key = booking.createdAt.toISOString().slice(0, 10);
      bookingCounts.set(key, (bookingCounts.get(key) ?? 0) + 1);
    });

    const revenueCounts = new Map<string, number>();
    const revenueGroups = await this.prismaService.$queryRaw<
      Array<{ day: string; total: Prisma.Decimal | null }>
    >`SELECT to_char("createdAt"::date, 'YYYY-MM-DD') AS day,
       SUM(amount)::numeric AS total
       FROM "Payment"
       WHERE "createdAt" >= ${rangeStart}
         AND status IN ('SUCCESS', 'REFUNDED')
       GROUP BY day
       ORDER BY day ASC`;
    revenueGroups.forEach((row) => {
      if (!row.day) return;
      revenueCounts.set(row.day, Number(row.total ?? 0));
    });

    const trendPoints: DashboardTrendPoint[] = dayKeys.map((key) => ({
      label: dayLabelMap.get(key) ?? key,
      bookings: bookingCounts.get(key) ?? 0,
      revenue: revenueCounts.get(key) ?? 0,
    }));

    const bookingActivities: DashboardRecentActivity[] = recentBookings.map(
      (booking) => ({
        user: booking.user.fullName,
        action:
          booking.status === BookingStatus.CANCELLED ? 'Cancelled' : 'Booked',
        date: booking.createdAt.toISOString(),
        status:
          booking.status === BookingStatus.CANCELLED ? 'Warning' : 'Success',
      }),
    );

    const refundActivities: DashboardRecentActivity[] = recentRefunds.map(
      (refund) => ({
        user: refund.user.fullName,
        action: 'Refund Requested',
        date: refund.createdAt.toISOString(),
        status: refund.status === RefundStatus.PENDING ? 'Pending' : 'Success',
      }),
    );

    const recentActivity = [...bookingActivities, ...refundActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return {
      totalUsers,
      totalBuses,
      totalTrips,
      totalBookings,
      totalRevenue: paymentAggregate._sum.amount
        ? paymentAggregate._sum.amount.toString()
        : '0',
      pendingRefunds,
      bookingTrends: trendPoints.map(({ label, bookings }) => ({
        label,
        bookings,
        revenue: 0,
      })),
      revenueOverview: trendPoints.map(({ label, revenue }) => ({
        label,
        bookings: 0,
        revenue,
      })),
      recentActivity,
    };
  }
}
