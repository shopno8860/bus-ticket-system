import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Route, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreateRouteDto } from './dto/create-route.dto';
import { RoutesService } from './routes.service';
import { PointsService } from '../points/points.service';

/** Public route list; create route is ADMIN-only. */
@ApiTags('Routes')
@Controller('routes')
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly pointsService: PointsService,
  ) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create route (ADMIN)' })
  async create(
    @Body() createRouteDto: CreateRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Route> {
    return this.routesService.create(createRouteDto, currentUser.operatorId!);
  }

  @Get()
  @ApiOperation({ summary: 'List all routes' })
  async findAll(): Promise<Route[]> {
    return this.routesService.findAll();
  }

  @Get(':id/points')
  @ApiOperation({ summary: 'List active boarding/dropping points for a route' })
  async getPoints(@Param('id') id: string) {
    return this.pointsService.listForRoute(id, true);
  }
}
