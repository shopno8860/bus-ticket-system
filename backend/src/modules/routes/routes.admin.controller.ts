import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Route, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RoutesService } from './routes.service';

@ApiTags('Routes (admin)')
@ApiBearerAuth('JWT')
@Controller('routes')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RoutesAdminController {
  constructor(private readonly routesService: RoutesService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update route' })
  async update(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Route> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'update_route',
      targetRouteId: id,
      timestamp: new Date().toISOString(),
    });
    return this.routesService.update(id, updateRouteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete route' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Route> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'delete_route',
      targetRouteId: id,
      timestamp: new Date().toISOString(),
    });
    return this.routesService.remove(id);
  }
}
