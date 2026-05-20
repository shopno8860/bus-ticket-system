import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, RefundStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
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
  operatorId: string | null;
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
  action: 'Booked' | 'Cancelled' | 'Expired' | 'Refund Requested';
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
  operatorId: true,
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

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPasswordMatches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null,
      },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prismaService.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const PLATFORM_FEE_PER_SEAT_AC = 70;
    const PLATFORM_FEE_PER_SEAT_NON_AC = 40;

    const [totalUsers, totalBuses, totalTrips, totalBookings, pendingRefunds] =
      await Promise.all([
        this.prismaService.user.count(),
        this.prismaService.bus.count(),
        this.prismaService.trip.count(),
        this.prismaService.booking.count(),
        this.prismaService.refund.count({
          where: { status: RefundStatus.PENDING },
        }),
      ]);

    const platformRevenueAggregate = await this.prismaService.$queryRaw<
      Array<{ total: Prisma.Decimal | null }>
    >`SELECT COALESCE(SUM(
        COALESCE(bs.seat_count, 0) *
        CASE
          WHEN bus."busType" = 'AC' THEN ${PLATFORM_FEE_PER_SEAT_AC}::int
          ELSE ${PLATFORM_FEE_PER_SEAT_NON_AC}::int
        END
      ), 0)::numeric AS total
      FROM "Booking" b
      JOIN "Trip" t ON t.id = b."tripId"
      JOIN "Bus" bus ON bus.id = t."busId"
      LEFT JOIN (
        SELECT "bookingId", COUNT(*)::int AS seat_count
        FROM "BookingSeat"
        GROUP BY "bookingId"
      ) bs ON bs."bookingId" = b.id
      WHERE EXISTS (
        SELECT 1
        FROM "Payment" p
        WHERE p."bookingId" = b.id
          AND p.status IN ('SUCCESS', 'REFUNDED')
      )`;

    const adminBookingRevenue = await this.prismaService.$queryRaw<
      Array<{ total: Prisma.Decimal | null }>
    >`SELECT COALESCE(SUM(
        COALESCE("finalAmount", "totalAmount", 0)
      ), 0)::numeric AS total
      FROM "Booking"
      WHERE "bookingSource" = 'ADMIN_BOOKING'
        AND status = 'CONFIRMED'`;

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
    >`WITH successful_bookings AS (
        SELECT DISTINCT ON ("bookingId")
          "bookingId",
          "createdAt"
        FROM "Payment"
        WHERE status IN ('SUCCESS', 'REFUNDED')
        ORDER BY "bookingId", "createdAt" ASC
      )
      SELECT to_char(sb."createdAt"::date, 'YYYY-MM-DD') AS day,
       SUM(
         COALESCE(bs.seat_count, 0) *
         CASE
           WHEN bus."busType" = 'AC' THEN ${PLATFORM_FEE_PER_SEAT_AC}::int
           ELSE ${PLATFORM_FEE_PER_SEAT_NON_AC}::int
         END
       )::numeric AS total
       FROM successful_bookings sb
       JOIN "Booking" b ON b.id = sb."bookingId"
       JOIN "Trip" t ON t.id = b."tripId"
       JOIN "Bus" bus ON bus.id = t."busId"
       LEFT JOIN (
         SELECT "bookingId", COUNT(*)::int AS seat_count
         FROM "BookingSeat"
         GROUP BY "bookingId"
       ) bs ON bs."bookingId" = b.id
       WHERE sb."createdAt" >= ${rangeStart}
       GROUP BY day
       ORDER BY day ASC`;
    revenueGroups.forEach((row) => {
      if (!row.day) return;
      revenueCounts.set(row.day, Number(row.total ?? 0));
    });

    const adminDailyRevenue = await this.prismaService.$queryRaw<
      Array<{ day: string; total: Prisma.Decimal | null }>
    >`SELECT to_char("createdAt"::date, 'YYYY-MM-DD') AS day,
       SUM(COALESCE("finalAmount", "totalAmount", 0))::numeric AS total
       FROM "Booking"
       WHERE "bookingSource" = 'ADMIN_BOOKING'
         AND status = 'CONFIRMED'
         AND "createdAt" >= ${rangeStart}
       GROUP BY day
       ORDER BY day ASC`;
    adminDailyRevenue.forEach((row) => {
      if (!row.day) return;
      const existing = revenueCounts.get(row.day) ?? 0;
      revenueCounts.set(row.day, existing + Number(row.total ?? 0));
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
          booking.status === BookingStatus.CANCELLED
            ? 'Cancelled'
            : booking.status === BookingStatus.EXPIRED
              ? 'Expired'
              : 'Booked',
        date: booking.createdAt.toISOString(),
        status:
          booking.status === BookingStatus.CANCELLED ||
          booking.status === BookingStatus.EXPIRED
            ? 'Warning'
            : 'Success',
      }),
    );

    const refundActivities: DashboardRecentActivity[] = recentRefunds.map(
      (refund) => ({
        user: refund.user.fullName,
        action: 'Refund Requested',
        date: refund.createdAt.toISOString(),
        status:
          refund.status === RefundStatus.PENDING
            ? 'Pending'
            : refund.status === RefundStatus.APPROVED
              ? 'Success'
              : 'Warning',
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
      totalRevenue: (
        Number(platformRevenueAggregate[0]?.total ?? 0) +
        Number(adminBookingRevenue[0]?.total ?? 0)
      ).toString(),
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
