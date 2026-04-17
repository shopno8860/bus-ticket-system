import { Body, Controller, Get, Post } from '@nestjs/common';
import { Route } from '@prisma/client';
import { CreateRouteDto } from './dto/create-route.dto';
import { RoutesService } from './routes.service';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  async create(@Body() createRouteDto: CreateRouteDto): Promise<Route> {
    return this.routesService.create(createRouteDto);
  }

  @Get()
  async findAll(): Promise<Route[]> {
    return this.routesService.findAll();
  }
}
