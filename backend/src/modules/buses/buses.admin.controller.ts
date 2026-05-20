import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Bus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { BusesService } from './buses.service';
import { UpdateBusDto } from './dto/update-bus.dto';

@ApiTags('Buses (admin)')
@ApiBearerAuth('JWT')
@Controller('buses')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BusesAdminController {
  constructor(private readonly busesService: BusesService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update bus' })
  async update(
    @Param('id') id: string,
    @Body() updateBusDto: UpdateBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Bus> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'update_bus',
      targetBusId: id,
      timestamp: new Date().toISOString(),
    });
    return this.busesService.update(id, updateBusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bus' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Bus> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'delete_bus',
      targetBusId: id,
      timestamp: new Date().toISOString(),
    });
    return this.busesService.remove(id);
  }
}
