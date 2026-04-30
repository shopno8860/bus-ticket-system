import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

type UserResponse = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async findMe(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    return this.usersService.findCurrentUser(currentUser.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.updateProfile(currentUser.sub, updateUserDto);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async changeRole(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangeUserRoleDto,
  ): Promise<UserResponse> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'change_user_role',
      targetUserId: id,
      role: dto.role,
      timestamp: new Date().toISOString(),
    });
    return this.usersService.changeUserRole(id, currentUser.sub, dto);
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalBuses: number;
    totalTrips: number;
    totalBookings: number;
    totalRevenue: string;
    pendingRefunds: number;
    bookingTrends: Array<{
      label: string;
      bookings: number;
      revenue: number;
    }>;
    revenueOverview: Array<{
      label: string;
      bookings: number;
      revenue: number;
    }>;
    recentActivity: Array<{
      user: string;
      action: 'Booked' | 'Cancelled' | 'Refund Requested';
      date: string;
      status: 'Success' | 'Warning' | 'Pending';
    }>;
  }> {
    return this.usersService.getDashboardStats();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async findOneById(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.findOneById(id);
  }
}
