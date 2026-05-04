import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { type UserResponse, UsersService } from './users.service';

/** Authenticated user profile, password, account deletion, and admin user management. */
@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user (sanitized)' })
  async findMe(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    return this.usersService.findCurrentUser(currentUser.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all users (ADMIN)' })
  async findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile fields for current user' })
  async updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponse> {
    return this.usersService.updateProfile(currentUser.sub, updateProfileDto);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for current user' })
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(currentUser.sub, changePasswordDto);
  }

  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete or remove current user account (per service rules)' })
  async deleteAccount(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.usersService.deleteAccount(currentUser.sub);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Change another user role (ADMIN)' })
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
  @ApiOperation({
    summary: 'Dashboard aggregates (ADMIN)',
    description: 'Counts, revenue strings, trends, and recent activity for admin UI.',
  })
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
      action: 'Booked' | 'Cancelled' | 'Expired' | 'Refund Requested';
      date: string;
      status: 'Success' | 'Warning' | 'Pending';
    }>;
  }> {
    return this.usersService.getDashboardStats();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get user by id (ADMIN)' })
  async findOneById(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.findOneById(id);
  }
}
