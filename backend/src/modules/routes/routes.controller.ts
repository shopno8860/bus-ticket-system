import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Route, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateRouteDto } from './dto/create-route.dto';
import { RoutesService } from './routes.service';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createRouteDto: CreateRouteDto): Promise<Route> {
    return this.routesService.create(createRouteDto);
  }

  @Get()
  async findAll(): Promise<Route[]> {
    return this.routesService.findAll();
  }
}
